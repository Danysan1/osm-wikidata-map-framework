import type { BBox } from "geojson";
import { LngLat } from "maplibre-gl";
import { parse as parseWKT } from "wellknown";
import type { MapDatabase } from "../db/MapDatabase";
import type { SparqlResponse, SparqlResponseBindingValue } from "../generated/sparql/api";
import type { Etymology, OsmType } from "../model/Etymology";
import { OwmfFeatureProperties } from "../model/OwmfFeatureProperties";
import { getFeatureLinkedEntities, type OwmfFeature, type OwmfResponse } from "../model/OwmfResponse";
import { SourcePreset } from "../model/SourcePreset";
import type { MapService } from "./MapService";
import { WikidataService } from "./WikidataService";

const NEARBY_FEATURE_THRESHOLD = process.env.owmf_nearby_feature_threshold ? parseInt(process.env.owmf_nearby_feature_threshold) : undefined;
const fetchSparqlQuery = (type: string) => fetch(`/wdqs/${type}.sparql`).then(r => {
    if (r.status !== 200) throw new Error("Failed fetching SPARQL template from " + r.url);
    return r.text();
});

export class WikidataMapService extends WikidataService implements MapService {
    private readonly preset: SourcePreset;
    private readonly db?: MapDatabase;
    private readonly resolveQuery: (type: string) => Promise<string>;

    public constructor(preset: SourcePreset, db?: MapDatabase, resolveQuery?: (type: string) => Promise<string>) {
        super();
        this.preset = preset;
        this.db = db;
        this.resolveQuery = resolveQuery ?? fetchSparqlQuery;
    }

    public canHandleBackEnd(backEndID: string): boolean {
        if (!this.preset.osm_wikidata_properties && backEndID === "wd_direct")
            return false;
        else if (!this.preset.wikidata_indirect_property && ["wd_reverse", "wd_qualifier", "wd_indirect"].includes(backEndID))
            return false;
        else
            return /^wd_(base|direct|indirect|reverse|qualifier)(_P\d+)?$/.test(backEndID);
    }

    public async fetchMapElements(backEndID: string, onlyCentroids: boolean, bbox: BBox, language: string, year: number): Promise<OwmfResponse> {
        void onlyCentroids; // Wikidata has only centroids

        const cachedResponse = await this.db?.getMap(this.preset.id, backEndID, true, bbox, language, year);
        if (cachedResponse)
            return cachedResponse;

        console.debug("No cached response found, fetching from Wikidata Query Service", { sourcePresetID: this.preset?.id, backEndID, bbox, language });
        let sparqlQueryTemplate: string;
        if (backEndID === "wd_base")
            sparqlQueryTemplate = await this.getBaseSparqlQuery();
        else if (backEndID.startsWith("wd_direct"))
            sparqlQueryTemplate = await this.getDirectSparqlQuery(backEndID);
        else if (/^wd_(reverse|qualifier|indirect)$/.test(backEndID))
            sparqlQueryTemplate = await this.getIndirectSparqlQuery(backEndID);
        else
            throw new Error(`Invalid Wikidata back-end ID: "${backEndID}"`);

        const maxElements = process.env.owmf_max_map_elements,
            wikidataCountry = process.env.owmf_wikidata_country,
            wikidataCountryQuery = wikidataCountry ? `?item wdt:P17 wd:${wikidataCountry}.` : '',
            filterClasses = this.preset.wikidata_filter_classes?.map(c => `wd:${c}`).join(" "),
            classFilterQuery = filterClasses ? `VALUES ?class { ${filterClasses} } ?item wdt:P31/wdt:P279? ?class.` : '',
            sparqlQuery = sparqlQueryTemplate
                .replaceAll('${classFilterQuery}', classFilterQuery)
                .replaceAll('${wikidataCountryQuery}', wikidataCountryQuery)
                .replaceAll('${language}', language)
                .replaceAll('${limit}', maxElements ? "LIMIT " + maxElements : "")
                .replaceAll('${westLon}', bbox[0].toString())
                .replaceAll('${southLat}', bbox[1].toString())
                .replaceAll('${eastLon}', bbox[2].toString())
                .replaceAll('${northLat}', bbox[3].toString());
        // TODO Filter by year

        console.time("wikidata_fetch");
        const ret: SparqlResponse = (await this.api.postSparqlQuery("sparql", sparqlQuery, "json")).data;
        console.timeEnd("wikidata_fetch");

        if (!ret.results?.bindings)
            throw new Error("Invalid response from Wikidata (no bindings)");

        console.time("wikidata_transform");
        const out: OwmfResponse = {
            type: "FeatureCollection",
            bbox: bbox,
            features: ret.results.bindings.reduce<OwmfFeature[]>((acc, row) => this.featureReducer(acc, row), []),
            wdqs_query: sparqlQuery,
            timestamp: new Date().toISOString(),
            sourcePresetID: this.preset.id,
            backEndID: backEndID,
            onlyCentroids: true,
            language: language,
            year: year,
            truncated: !!maxElements && ret.results.bindings.length === parseInt(maxElements),
        };
        out.total_entity_count = out.features.reduce((acc, feature) => acc + (feature.properties?.linked_entity_count ?? 0), 0);

        console.timeEnd("wikidata_transform");
        console.debug(`Wikidata fetchMapElements found ${out.features.length} features with ${out.total_entity_count} linked entities from ${ret.results.bindings.length} rows`);
        void this.db?.addMap(out);
        return out;
    }

    private async getBaseSparqlQuery() {
        return await this.resolveQuery("base");
    }

    private async getDirectSparqlQuery(backEndID: string) {
        let properties: string[];
        const sourceProperty = /^wd_direct_(P\d+)$/.exec(backEndID)?.at(1),
            directProperties = this.preset.osm_wikidata_properties;
        if (!directProperties?.length)
            throw new Error("Empty direct properties");

        if (!sourceProperty)
            properties = directProperties;
        else if (!directProperties.includes(sourceProperty))
            throw new Error("Invalid sourceProperty: " + sourceProperty);
        else
            properties = [sourceProperty];

        const sparqlQueryTemplate = await this.resolveQuery("direct");
        return sparqlQueryTemplate.replaceAll('${directPropertyValues}', properties.map(pID => `(p:${pID} ps:${pID})`).join(" "));
    }

    private async getIndirectSparqlQuery(backEndID: string) {
        const indirectProperty = this.preset.wikidata_indirect_property;
        if (!indirectProperty)
            throw new Error("No indirect property in preset " + this.preset.id);

        let sparqlQueryTemplate: string;
        if (backEndID === "wd_indirect")
            sparqlQueryTemplate = await this.resolveQuery("indirect");
        else if (backEndID === "wd_reverse")
            sparqlQueryTemplate = await this.resolveQuery("reverse");
        else if (backEndID === "wd_qualifier")
            sparqlQueryTemplate = await this.resolveQuery("qualifier");
        else
            throw new Error(`Invalid Wikidata indirect back-end ID: "${backEndID}"`);

        const imageProperty = this.preset.wikidata_image_property,
            pictureQuery = imageProperty ? `OPTIONAL { ?etymology wdt:${imageProperty} ?_picture. }` : '';
        return sparqlQueryTemplate
            .replaceAll('${indirectProperty}', indirectProperty)
            .replaceAll('${pictureQuery}', pictureQuery);
    }

    private featureReducer(acc: OwmfFeature[], row: Record<string, SparqlResponseBindingValue>): OwmfFeature[] {
        if (!row.location?.value) {
            console.warn("Invalid response from Wikidata (no location)", row);
            return acc;
        }

        const wkt_geometry = row.location.value,
            geometry = parseWKT(wkt_geometry);
        if (geometry?.type !== "Point") {
            console.debug("Failed to parse WKT coordinates", { wkt_geometry, geometry, row });
            return acc;
        }

        const feature_wd_id = row.item?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
            etymology_wd_id = row.etymology?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
            lngLat = new LngLat(geometry.coordinates[0], geometry.coordinates[1]),
            existingFeature = acc.find(feature => {
                if (feature_wd_id && feature.properties?.wikidata === feature_wd_id)
                    return true; // Both features have the same Wikidata ID => They are the same entity

                if (feature_wd_id && feature.properties?.wikidata && feature.properties.wikidata !== feature_wd_id)
                    return false; // Different Wikidata IDs => Different entities

                // One of the features has no Wikidata ID => if they have the same coordinates we consider them as one single entity
                if (NEARBY_FEATURE_THRESHOLD && feature.geometry.type === "Point" && lngLat.distanceTo(new LngLat(feature.geometry.coordinates[0], feature.geometry.coordinates[1])) < NEARBY_FEATURE_THRESHOLD) {
                    console.warn("Merging features with the same coordinates", row, feature);
                    return true;
                }

                return false; // All equality checks failed => They are different entities              
            });

        let etymology: Etymology | undefined;
        if (etymology_wd_id && existingFeature && getFeatureLinkedEntities(existingFeature)?.some(etymology => etymology.wikidata === etymology_wd_id)) {
            console.warn("Wikidata: Ignoring duplicate etymology", { etymology_wd_id, existing: existingFeature.properties, new: row });
        } else if (etymology_wd_id) {
            etymology = {
                from_wikidata: true,
                from_wikidata_entity: row.from_entity?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
                from_wikidata_prop: row.from_prop?.value?.replace(WikidataService.WD_PROPERTY_WDT_PREFIX, "")?.replace(WikidataService.WD_PROPERTY_P_PREFIX, ""),
                propagated: false,
                statementEntity: row.statementEntity?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
                wikidata: etymology_wd_id,
            };
        }

        let osm_id: number | undefined,
            osm_type: OsmType | undefined,
            ohm_id: number | undefined,
            ohm_type: OsmType | undefined;
        if (row.osm_rel?.value) {
            osm_type = "relation";
            osm_id = parseInt(row.osm_rel.value);
        } else if (row.osm_way?.value) {
            osm_type = "way";
            osm_id = parseInt(row.osm_way.value);
        } else if (row.osm_node?.value) {
            osm_type = "node";
            osm_id = parseInt(row.osm_node.value);
        }
        if (row.ohm_rel?.value) {
            ohm_type = "relation";
            ohm_id = parseInt(row.ohm_rel.value);
        }

        let render_height;
        if (row.height?.value)
            render_height = parseInt(row.height?.value);
        else if (row.levels?.value)
            render_height = parseInt(row.levels?.value) * 4;
        else if (row.building?.value)
            render_height = 6;

        const feature_alias_wd_id = row.alias?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
            commonProps: OwmfFeatureProperties = {
                commons: row.commons?.value,
                iiif_url: row.iiif?.value,
                osm_id: osm_id,
                osm_type: osm_type,
                ohm_id: ohm_id,
                ohm_type: ohm_type,
                picture: row.picture?.value,
                render_height: render_height,
                tags: {
                    description: row.itemDescription?.value,
                    name: row.itemLabel?.value,
                    website: row.website?.value,
                },
                wikidata: feature_wd_id,
                wikidata_alias: feature_alias_wd_id,
                wikipedia: row.wikipedia?.value,
                wikispore: row.wikispore?.value,
            };

        const from_wikidata_entity = feature_wd_id ? feature_wd_id : etymology?.from_wikidata_entity,
            from_wikidata_prop = feature_wd_id ? "P625" : etymology?.from_wikidata_prop,
            id = `wikidata.org/entity/${from_wikidata_entity}#${from_wikidata_prop}`,
            specificProps: OwmfFeatureProperties = {
                id: id,
                from_wikidata: true,
                from_wikidata_entity: from_wikidata_entity,
                from_wikidata_prop: from_wikidata_prop,
            }

        if (existingFeature) { // Merge the details (and new etymology, if any) into the existing feature for this entity
            existingFeature.properties ??= specificProps;
            Object.assign(existingFeature.properties, Object.fromEntries(
                Object.entries(commonProps).filter(([, v]) => v !== undefined)
            )); // Merges the properties objects, overwriting only non-undefined properties ( https://stackoverflow.com/a/56650790/2347196 )
            if (etymology) {
                getFeatureLinkedEntities(existingFeature).push(etymology);
                existingFeature.properties.linked_entity_count = (existingFeature.properties.linked_entity_count ?? 0) + 1;
            }
        } else { // Add the new feature for this item 
            acc.push({
                type: "Feature",
                id: id,
                geometry,
                properties: {
                    ...commonProps,
                    ...specificProps,
                    linked_entities: etymology ? [etymology] : undefined,
                    linked_entity_count: etymology ? 1 : 0,
                }
            });
        }
        return acc;
    }
}