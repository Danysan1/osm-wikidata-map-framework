import type { BBox, Point } from "geojson";
import { parse as parseWKT } from "wellknown";
import type { MapDatabase } from "../../db/MapDatabase";
import { SparqlApi, SparqlBackend, SparqlResponse, SparqlResponseBindingValue } from "../../generated/sparql/api";
import { Configuration } from "../../generated/sparql/configuration";
import { LinkedEntity, OsmInstance, OsmType } from "../../model/LinkedEntity";
import { getFeatureLinkedEntities, osmKeyToKeyID, type OwmfFeature, type OwmfResponse } from "../../model/OwmfResponse";
import type { SourcePreset } from "../../model/SourcePreset";
import type { MapService } from "../MapService";
import { WikidataService } from "../WikidataService";

const OSMKEY = "https://www.openstreetmap.org/wiki/Key:";
/**
 * Translates an OSM key to a Wikidata predicate.
 * 
 * We can't simply use the "osmkey:" prefix, we need the full URI, because keys can contain colons (e.g. "addr:street") which are not accepted in SPARQL prefixed names.
 * @see https://stackoverflow.com/a/5824414/2347196
 */
const keyPredicate = (key: string) => key.includes(":") ? "<" + OSMKEY + key + ">" : "osmkey:" + key;
const commonsCategoryRegex = /(Category:[^;]+)/;
const commonsFileRegex = /(File:[^;]+)/;
const fetchSparqlQuery = (type: string) => fetch(`/qlever/${type}.sparql`, { cache: "force-cache" }).then(r => {
    if (r.status !== 200) throw new Error("Failed fetching SPARQL template from " + r.url);
    return r.text();
});

export class QLeverMapService implements MapService {
    public static readonly WD_ENTITY_PREFIX = "http://www.wikidata.org/entity/";
    public static readonly WD_PROPERTY_PREFIX = "http://www.wikidata.org/prop/direct/";
    private readonly preset: SourcePreset;
    private readonly maxElements?: number;
    private readonly db?: MapDatabase;
    private readonly baseBBox?: BBox;
    private readonly api: SparqlApi;
    private readonly resolveQuery: (type: string) => Promise<string>;

    public constructor(
        preset: SourcePreset,
        maxElements?: number,
        maxRelationMembers?: number,
        db?: MapDatabase,
        bbox?: BBox,
        resolveQuery?: (type: string) => Promise<string>,
        basePath = 'https://qlever.cs.uni-freiburg.de/api'
    ) {
        this.preset = preset;
        this.maxElements = maxElements;
        this.db = db;
        this.baseBBox = bbox;
        this.resolveQuery = resolveQuery ?? fetchSparqlQuery;
        this.api = new SparqlApi(new Configuration({
            basePath,
            // headers: { "User-Agent": "OSM-Wikidata-Map-Framework" }
        }));

        console.debug("QLeverMapService currently ignores maxRelationMembers", { maxElements, maxRelationMembers, basePath });
    }

    public canHandleBackEnd(backEndID: string): boolean {
        if (!this.preset.wikidata_indirect_property && ["reverse", "qualifier", "indirect"].some(x => backEndID.includes(x)))
            return false;
        else if (!this.preset.osm_wikidata_properties && backEndID.includes("_direct"))
            return false;
        else
            return /^qlever_((wd_(base|direct|indirect|reverse|qualifier)(_P\d+)?)|(osm_[_a-z]+)|(ohm_[_a-z]+))$/.test(backEndID);
    }

    public async fetchMapElements(backEndID: string, onlyCentroids: boolean, bbox: BBox, language: string, year: number): Promise<OwmfResponse> {
        language = language.split("_")[0]; // Ignore country

        if (this.baseBBox && (bbox[2] < this.baseBBox[0] || bbox[3] < this.baseBBox[1] || bbox[0] > this.baseBBox[2] || bbox[1] > this.baseBBox[3])) {
            console.warn("QLever fetchMapElements: request bbox does not overlap with the instance bbox", { bbox, baseBBox: this.baseBBox });
            return { type: "FeatureCollection", features: [] };
        }

        const cachedResponse = await this.db?.getMap(this.preset.id, backEndID, onlyCentroids, bbox, language, year);
        if (cachedResponse)
            return cachedResponse;

        let backend: SparqlBackend, site: OsmInstance | undefined;
        if (backEndID.startsWith("qlever_osm")) {
            backend = SparqlBackend.OsmPlanet;
            site = OsmInstance.OpenStreetMap
        } else if (process.env.enable_open_historical_map === "true" && backEndID.startsWith("qlever_ohm")) {
            backend = SparqlBackend.OhmPlanet;
            site = OsmInstance.OpenHistoricalMap;
        } else {
            backend = "wikidata";
        }

        const sparqlQueryTemplate = await this.getSparqlQueryTemplate(backEndID),
            sparqlQuery = this.fillPlaceholders(backEndID, onlyCentroids, sparqlQueryTemplate, bbox)
                .replaceAll('${language}', language)
                .replaceAll('${limit}', this.maxElements ? "LIMIT " + this.maxElements : ""),
            // TODO Filter by date
            ret: SparqlResponse = (await this.api.postSparqlQuery(backend, sparqlQuery, "json")).data;

        if (!ret.results?.bindings)
            throw new Error("Invalid response from Wikidata (no bindings)");

        const out: OwmfResponse = {
            type: "FeatureCollection",
            bbox: bbox,
            features: ret.results.bindings.reduce(this.buildFeatureReducer(site), []),
            timestamp: new Date().toISOString(),
            sourcePresetID: this.preset.id,
            backEndID: backEndID,
            onlyCentroids: onlyCentroids,
            language: language,
            site: site,
            year: year,
            truncated: ret.results.bindings.length === this.maxElements,
        };
        out.total_entity_count = out.features.reduce((acc, feature) => acc + (feature.properties?.linked_entity_count ?? 0), 0);
        if (backend === "wikidata")
            out.qlever_wd_query = sparqlQuery;
        else
            out.qlever_osm_query = sparqlQuery;

        console.debug(`QLever fetchMapElements found ${out.features.length} features with ${out.total_entity_count} linked entities from ${ret.results.bindings.length} rows`);
        void this.db?.addMap(out);
        return out;
    }

    private async getSparqlQueryTemplate(backEndID: string) {
        if (backEndID.endsWith("m_wd")) // qlever_osm_wd, qlever_ohm_wd
            return await this.resolveQuery("osm_wd");
        else if (backEndID.endsWith("m_wd_base")) // qlever_osm_wd_base
            return await this.resolveQuery("osm_wd_base");
        else if (backEndID.endsWith("m_wd_direct")) // qlever_osm_wd_direct
            return await this.resolveQuery("osm_wd_direct");
        else if (backEndID.endsWith("m_wd_reverse")) // qlever_osm_wd_reverse
            return await this.resolveQuery("osm_wd_reverse");
        else if (/^qlever_o[sh]m_[^w]/.test(backEndID)) // qlever_osm_architect
            return await this.resolveQuery("osm_all");
        else if (backEndID === "qlever_wd_base")
            return await this.resolveQuery("wd_base");
        else if (backEndID.startsWith("qlever_wd_direct"))
            return await this.resolveQuery("wd_direct");
        else if (backEndID === "qlever_wd_indirect")
            return await this.resolveQuery("wd_indirect");
        else if (backEndID === "qlever_wd_reverse")
            return await this.resolveQuery("wd_reverse");
        else if (backEndID === "qlever_wd_qualifier")
            return await this.resolveQuery("wd_qualifier");
        else
            throw new Error(`Invalid QLever back-end ID: "${backEndID}"`);
    }

    private fillPlaceholders(backEndID: string, onlyCentroids: boolean, sparqlQuery: string, bbox: BBox): string {
        // TODO Use onlyCentroids
        if (backEndID.includes("osm") || backEndID.includes("ohm")) {
            const selected_key_id = /^qlever_osm_[^w]/.test(backEndID) ? backEndID.replace("qlever_", "") : null,
                all_osm_wikidata_keys_selected = !selected_key_id || selected_key_id.startsWith("osm_all"),
                osm_text_key = all_osm_wikidata_keys_selected ? this.preset.osm_text_key : undefined,
                osm_description_key = all_osm_wikidata_keys_selected ? this.preset.osm_description_key : undefined,
                selected_osm_wikidata_keys = all_osm_wikidata_keys_selected ? this.preset.osm_wikidata_keys : this.preset.osm_wikidata_keys?.filter(key => osmKeyToKeyID(key) === selected_key_id);
            if (this.preset.osm_wikidata_keys?.length && !selected_osm_wikidata_keys?.length)
                throw new Error(`Invalid selected_key_id: ${backEndID} => ${selected_key_id} not in osmWikidataKeys`);

            const filter_tags = this.preset.osm_filter_tags?.map(tag => tag.replace("=*", "")),
                filter_tags_with_value = filter_tags?.filter(tag => tag.includes("=")),
                filter_keys = filter_tags?.filter(tag => !tag.includes("=")),
                filter_osm_wd_keys = filter_tags?.length ? selected_osm_wikidata_keys?.filter(key => filter_tags.includes(key)) : selected_osm_wikidata_keys,
                non_filter_osm_wd_keys = selected_osm_wikidata_keys?.filter(key => !filter_keys?.includes(key)),
                filter_non_etymology_keys = filter_keys?.filter(key => key !== osm_text_key && key !== osm_description_key && !this.preset.osm_wikidata_keys?.includes(key)),
                filterKeysExpression = filter_non_etymology_keys?.length ? filter_non_etymology_keys.map(keyPredicate)?.join('|') + " ?_value; " : "", // TODO Use blank nodes
                non_filter_osm_wd_predicate = non_filter_osm_wd_keys?.map(keyPredicate)?.join('|'),
                osmEtymologyUnionBranches: string[] = [];
            console.debug("fillPlaceholders", {
                filter_tags, filter_tags_with_value, filter_keys, filter_osm_wd_keys, non_filter_wd_keys: non_filter_osm_wd_keys, filter_non_etymology_keys, filterExpression: filterKeysExpression
            });

            if (filter_osm_wd_keys?.length) {
                const wikidata_predicate = filter_osm_wd_keys.map(keyPredicate)?.join('|');
                osmEtymologyUnionBranches.push(`?osm ${wikidata_predicate} ?etymology. # Key is both filter and etymology`);
            }

            if (non_filter_osm_wd_predicate) {
                osmEtymologyUnionBranches.push(`?osm ${filterKeysExpression}${non_filter_osm_wd_predicate} ?etymology. # Filter key + Etymology key`);

                filter_tags_with_value?.forEach(tag => {
                    const predicate = keyPredicate(tag.split("=")[0]),
                        value = tag.split("=")[1];
                    osmEtymologyUnionBranches.push(`?osm ${predicate} '${value}'; ${non_filter_osm_wd_predicate} ?etymology. # Filter tag + Etymology key`);
                });
            }

            if (osm_text_key?.length)
                osmEtymologyUnionBranches.push(`?osm ${filterKeysExpression}${keyPredicate(osm_text_key)} ?etymology_text. # Etymology text key`);

            if (osm_description_key?.length)
                osmEtymologyUnionBranches.push(`?osm ${filterKeysExpression}${keyPredicate(osm_description_key)} ?etymology_description. # Etymology description key`);

            let osmEtymologyExpression = "";
            if (osmEtymologyUnionBranches.length === 1)
                osmEtymologyExpression = osmEtymologyUnionBranches[0];
            if (osmEtymologyUnionBranches.length > 1)
                osmEtymologyExpression = "{\n        " + osmEtymologyUnionBranches.join("\n    } UNION {\n        ") + "\n    }";
            sparqlQuery = sparqlQuery
                .replaceAll('${osmTextSelect}', osm_text_key?.length ? '?etymology_text' : "")
                .replaceAll('${osmDescriptionSelect}', osm_description_key?.length ? '?etymology_description' : "")
                .replaceAll('${osmEtymologyExpression}', osmEtymologyExpression);
        }

        if (backEndID.includes("ohm")) {
            sparqlQuery = sparqlQuery.replaceAll("openstreetmap.org/relation", "openhistoricalmap.org/relation");
        }

        if (backEndID.includes("indirect") || backEndID.includes("reverse") || backEndID.includes("qualifier")) {
            const indirectProperty = this.preset.wikidata_indirect_property;
            if (!indirectProperty)
                throw new Error("No indirect property in preset" + this.preset.id);
            const imageProperty = this.preset.wikidata_image_property,
                pictureQuery = imageProperty ? `OPTIONAL { ?etymology wdt:${imageProperty} ?_picture. }` : '';

            sparqlQuery = sparqlQuery
                .replaceAll('${indirectProperty}', indirectProperty)
                .replaceAll('${pictureQuery}', pictureQuery);
        } else if (backEndID.includes("direct")) {
            let properties: string[];
            const sourceProperty = /_direct_(P\d+)$/.exec(backEndID)?.at(1),
                directProperties = this.preset.osm_wikidata_properties;
            if (!directProperties?.length)
                throw new Error("Empty direct properties");

            if (!sourceProperty)
                properties = directProperties;
            else if (!directProperties.includes(sourceProperty))
                throw new Error("Invalid sourceProperty: " + sourceProperty);
            else
                properties = [sourceProperty];

            sparqlQuery = sparqlQuery
                .replaceAll('${directProperty}', properties[0])
                .replaceAll('${directPropertyValues}', properties.map(pID => `(p:${pID} ps:${pID})`).join(" "));
        }

        const wikidataCountry = process.env.NEXT_PUBLIC_OWMF_wikidata_country,
            wikidataCountryQuery = wikidataCountry ? `?item wdt:P17 wd:${wikidataCountry}.` : '',
            osmCountry = process.env.NEXT_PUBLIC_OWMF_osm_country,
            osmCountryQuery = osmCountry ? `osmrel:${osmCountry} ogc:sfContains ?osm.` : '';

        return sparqlQuery
            .replaceAll('${osmCountryQuery}', osmCountryQuery)
            .replaceAll('${wikidataCountryQuery}', wikidataCountryQuery)
            .replaceAll('${westLon}', bbox[0].toString())
            .replaceAll('${southLat}', bbox[1].toString())
            .replaceAll('${eastLon}', bbox[2].toString())
            .replaceAll('${northLat}', bbox[3].toString())
            .replaceAll('${centerLon}', ((bbox[0] + bbox[2]) / 2).toFixed(4))
            .replaceAll('${centerLat}', ((bbox[1] + bbox[3]) / 2).toFixed(4))
            .replaceAll('${maxDistanceKm}', Math.max(  // https://stackoverflow.com/a/1253545/2347196
                Math.abs(bbox[2] - bbox[0]) * 111 * Math.cos(bbox[1] * Math.PI / 180) / 2,
                Math.abs(bbox[3] - bbox[1]) * 111 / 2
            ).toFixed(4));
    }

    private buildFeatureReducer(site?: OsmInstance) {
        return (acc: OwmfFeature[], row: Record<string, SparqlResponseBindingValue>): OwmfFeature[] => {
            if (!row.location?.value) {
                console.warn("Invalid response from Wikidata (no location)", row);
                return acc;
            }

            const wkt_geometry = row.location.value,
                geometry = parseWKT(wkt_geometry) as Point | null;
            if (!geometry) {
                console.warn("Failed to parse WKT coordinates", { wkt_geometry, row });
                return acc;
            }

            const feature_wd_id: string | undefined = row.item?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
                etymology_wd_ids: string[] | undefined = typeof row.etymology?.value === "string" ? row.etymology.value.split(";").map((id: string) => id.replace(WikidataService.WD_ENTITY_PREFIX, "")) : undefined;

            (etymology_wd_ids?.length ? etymology_wd_ids : [undefined]).forEach(etymology_wd_id => { // [undefined] is used when there are no linked entities (like in https://osmwd.dsantini.it )
                const existingFeature = acc.find(feature => {
                    if (feature.id !== feature_wd_id)
                        return false; // Not the same feature

                    //console.info("Checking feature for merging", { wd_id: feature.id, feature_wd_id, geom: feature.geometry, geometry });
                    if (feature_wd_id)
                        return true; // Both features have the same Wikidata ID

                    // Both features have no Wikidata ID, check if they have the same coordinates
                    return feature.geometry.type === "Point" && feature.geometry.coordinates[0] === geometry.coordinates[0] && feature.geometry.coordinates[1] === geometry.coordinates[1];
                });

                if (etymology_wd_id && existingFeature && getFeatureLinkedEntities(existingFeature)?.some(etymology => etymology.wikidata === etymology_wd_id)) {
                    console.warn("QLever: Ignoring duplicate etymology", { wd_id: etymology_wd_id, existing: existingFeature?.properties, new: row });
                } else {
                    const feature_from_wikidata = row.from_wikidata?.value === 'true' || (row.from_wikidata?.value === undefined && !!row.item?.value);
                    let from_osm_instance: OsmInstance | undefined = row.from_osm?.value === 'true' ? site : undefined,
                        osm_id: number | undefined,
                        osm_type: OsmType | undefined;
                    if (row.osm_rel?.value) {
                        osm_type = "relation";
                        osm_id = parseInt(row.osm_rel.value);
                    } else if (row.osm_way?.value) {
                        osm_type = "way";
                        osm_id = parseInt(row.osm_way.value);
                    } else if (row.osm_node?.value) {
                        osm_type = "node";
                        osm_id = parseInt(row.osm_node.value);
                    } else if (row.osm?.value) {
                        const splits = /(\w+\.org)\/([a-z]+)\/([0-9]+)$/.exec(row.osm.value);
                        if (splits?.length === 4) {
                            from_osm_instance = splits[1] as OsmInstance;
                            osm_type = splits[2] as OsmType;
                            osm_id = parseInt(splits[3]);
                        }
                    }

                    const etymology: LinkedEntity | undefined = etymology_wd_id ? {
                        from_osm_instance,
                        from_osm_type: osm_type,
                        from_osm_id: osm_id,
                        from_wikidata: feature_from_wikidata,
                        from_wikidata_entity: row.from_entity?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
                        from_wikidata_prop: row.from_prop?.value?.replace(WikidataService.WD_PROPERTY_WDT_PREFIX, "")?.replace(WikidataService.WD_PROPERTY_P_PREFIX, ""),
                        propagated: false,
                        wikidata: etymology_wd_id,
                    } : undefined;

                    if (!existingFeature) { // Add the new feature for this item 
                        acc.push(this.createFeature(
                            row, geometry, feature_from_wikidata, feature_wd_id, from_osm_instance, osm_id, osm_type, etymology
                        ));
                    } else if (etymology) { // Add the new etymology to the existing feature for this feature
                        getFeatureLinkedEntities(existingFeature)?.push(etymology);
                    }
                }
            });
            return acc;
        }
    }

    private createFeature(
        row: Record<string, SparqlResponseBindingValue>,
        geometry: Point,
        from_wikidata: boolean,
        feature_wd_id?: string,
        osm_instance?: OsmInstance,
        osm_id?: number,
        osm_type?: OsmType,
        linkedEntity?: LinkedEntity
    ): OwmfFeature {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        const commons = row.commons?.value || (typeof row.wikimedia_commons?.value === "string" ? commonsCategoryRegex.exec(row.wikimedia_commons.value)?.at(1) : undefined),
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            picture = row.picture?.value || (typeof row.wikimedia_commons?.value === "string" ? commonsFileRegex.exec(row.wikimedia_commons.value)?.at(1) : undefined) || (typeof row.image?.value === "string" ? commonsFileRegex.exec(row.image.value)?.at(1) : undefined);

        let render_height;
        if (row.height?.value)
            render_height = parseInt(row.height?.value);
        else if (row.levels?.value)
            render_height = parseInt(row.levels?.value) * 4;
        else if (row.building?.value)
            render_height = 6;

        const from_wikidata_entity = feature_wd_id ? feature_wd_id : linkedEntity?.from_wikidata_entity,
            from_wikidata_prop = feature_wd_id ? "P625" : linkedEntity?.from_wikidata_prop;
        let id;
        if (osm_instance && from_wikidata)
            id = `${osm_instance}/${osm_type}/${osm_id}+wikidata.org/${from_wikidata_entity}/${from_wikidata_prop}`;
        else if (osm_instance)
            id = `${osm_instance}/${osm_type}/${osm_id}`;
        else
            id = "wikidata.org/" + from_wikidata_entity + "/" + from_wikidata_prop;

        const linkedEntities: LinkedEntity[] = linkedEntity ? [linkedEntity] : [],
            linkedName = row.etymology_text?.value,
            linkedDescription = row.etymology_description?.value;
        if (!!linkedName || !!linkedDescription) {
            linkedEntities.push({
                from_osm_instance: osm_instance,
                from_osm_id: osm_id,
                from_osm_type: osm_type,
                from_wikidata: false,
                name: linkedName,
                description: linkedDescription,
            });
        }

        return {
            type: "Feature",
            id: id,
            geometry,
            properties: {
                id: id,
                commons: commons,
                linked_entities: linkedEntities.length ? linkedEntities : undefined,
                linked_entity_count: linkedEntities.length,
                from_osm_instance: osm_instance,
                from_wikidata: from_wikidata,
                from_wikidata_entity,
                from_wikidata_prop,
                render_height: render_height,
                tags: {
                    description: row.itemDescription?.value,
                    name: row.itemLabel?.value,
                    website: row.website?.value,
                },
                ohm_id: osm_instance === OsmInstance.OpenHistoricalMap ? osm_id : undefined,
                ohm_type: osm_instance === OsmInstance.OpenHistoricalMap ? osm_type : undefined,
                osm_id: osm_instance === OsmInstance.OpenStreetMap ? osm_id : undefined,
                osm_type: osm_instance === OsmInstance.OpenStreetMap ? osm_type : undefined,
                picture: picture,
                wikidata: feature_wd_id,
                wikipedia: row.wikipedia?.value,
            }
        };
    }
}