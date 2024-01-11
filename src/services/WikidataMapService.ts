import { WikidataService } from "./WikidataService";
import indirectMapQuery from "./query/map/indirect.sparql";
import reverseMapQuery from "./query/map/reverse.sparql";
import qualifierMapQuery from "./query/map/qualifier.sparql";
import directMapQuery from "./query/map/direct.sparql";
import baseMapQuery from "./query/map/base.sparql";
import { getConfig, getStringArrayConfig } from "../config";
import { parse as parseWKT } from "wellknown";
import type { Point, BBox } from "geojson";
import type { EtymologyFeature, EtymologyResponse } from "../model/EtymologyResponse";
import { logErrorMessage } from "../monitoring";
import { MapDatabase } from "../db/MapDatabase";
import type { MapService } from "./MapService";
import type { Etymology } from "../model/Etymology";
import { getLanguage } from "../i18n";
import type { SparqlResponseBindingValue } from "../generated/sparql";
import { getEtymologies } from "./etymologyUtils";

export class WikidataMapService extends WikidataService implements MapService {
    protected db: MapDatabase;

    constructor(db: MapDatabase) {
        super();
        this.db = db;
    }

    canHandleBackEnd(backEndID: string): boolean {
        return /^wd_(base|direct|indirect|reverse|qualifier)(_P\d+)?$/.test(backEndID);
    }

    public fetchMapClusterElements(backEndID: string, bbox: BBox): Promise<EtymologyResponse> {
        return this.fetchMapData(backEndID, bbox);
    }

    public fetchMapElementDetails(backEndID: string, bbox: BBox): Promise<EtymologyResponse> {
        return this.fetchMapData(backEndID, bbox);
    }

    private async fetchMapData(backEndID: string, bbox: BBox): Promise<EtymologyResponse> {
        const language = getLanguage();
        let out = await this.db.getMap(backEndID, bbox, language);
        if (out) {
            if (process.env.NODE_ENV === 'development') console.debug(`Wikidata map cache hit, using cached response with ${out.features.length} features`, { backEndID, bbox, language: language, out });
        } else {
            if (process.env.NODE_ENV === 'development') console.debug("Wikidata map cache miss, fetching data", { backEndID, bbox, language: language });
            let sparqlQueryTemplate: string;
            if (backEndID === "wd_base")
                sparqlQueryTemplate = baseMapQuery;
            else if (backEndID.startsWith("wd_direct"))
                sparqlQueryTemplate = this.getDirectSparqlQuery(backEndID);
            else if (/^wd_(reverse|qualifier|indirect)$/.test(backEndID))
                sparqlQueryTemplate = this.getIndirectSparqlQuery(backEndID);
            else
                throw new Error(`Invalid Wikidata back-end ID: "${backEndID}"`);

            const maxElements = getConfig("max_map_elements"),
                wikidataCountry = getConfig("wikidata_country"),
                wikidataCountryQuery = wikidataCountry ? `?item wdt:P17 wd:${wikidataCountry}.` : '',
                sparqlQuery = sparqlQueryTemplate
                    .replaceAll('${wikidataCountryQuery}', wikidataCountryQuery)
                    .replaceAll('${language}', language || '')
                    .replaceAll('${limit}', maxElements ? "LIMIT " + maxElements : "")
                    .replaceAll('${westLon}', bbox[0].toString())
                    .replaceAll('${southLat}', bbox[1].toString())
                    .replaceAll('${eastLon}', bbox[2].toString())
                    .replaceAll('${northLat}', bbox[3].toString()),
                ret = await this.api.postSparqlQuery({ backend: "sparql", format: "json", query: sparqlQuery });

            if (!ret.results?.bindings)
                throw new Error("Invalid response from Wikidata (no bindings)");

            out = {
                type: "FeatureCollection",
                bbox: bbox,
                features: ret.results.bindings.reduce((acc: EtymologyFeature[], row) => this.featureReducer(acc, row), []),
                wdqs_query: sparqlQuery,
                timestamp: new Date().toISOString(),
                backEndID: backEndID,
                language: language,
                truncated: !!maxElements && ret.results.bindings.length === parseInt(maxElements),
            };
            out.etymology_count = out.features.reduce((acc, feature) => acc + (feature.properties?.etymologies?.length ?? 0), 0);
            if (process.env.NODE_ENV === 'development') console.debug(`Wikidata fetchMapData found ${out.features.length} features with ${out.etymology_count} etymologies from ${ret.results.bindings.length} rows`, out);
            void this.db.addMap(out);
        }
        return out;
    }

    private getDirectSparqlQuery(backEndID: string): string {
        let properties: string[];
        const sourceProperty = /^wd_direct_(P\d+)$/.exec(backEndID)?.at(1),
            directProperties = getStringArrayConfig("osm_wikidata_properties"),
            sparqlQueryTemplate = directMapQuery;
        if (!directProperties?.length)
            throw new Error("Empty direct properties");

        if (!sourceProperty)
            properties = directProperties;
        else if (!directProperties.includes(sourceProperty))
            throw new Error("Invalid sourceProperty: " + sourceProperty);
        else
            properties = [sourceProperty];

        return sparqlQueryTemplate.replaceAll('${directProperties}', properties.map(id => "wdt:" + id).join(" "));
    }

    private getIndirectSparqlQuery(backEndID: string): string {
        const indirectProperty = getConfig("wikidata_indirect_property");
        if (!indirectProperty)
            throw new Error("No indirect property defined");

        let sparqlQueryTemplate: string;
        if (backEndID === "wd_indirect")
            sparqlQueryTemplate = indirectMapQuery;
        else if (backEndID === "wd_reverse")
            sparqlQueryTemplate = reverseMapQuery;
        else if (backEndID === "wd_qualifier")
            sparqlQueryTemplate = qualifierMapQuery;
        else
            throw new Error(`Invalid Wikidata indirect back-end ID: "${backEndID}"`);

        const imageProperty = getConfig("wikidata_image_property"),
            pictureQuery = imageProperty ? `OPTIONAL { ?etymology wdt:${imageProperty} ?picture. }` : '';
        return sparqlQueryTemplate
            .replaceAll('${indirectProperty}', indirectProperty)
            .replaceAll('${pictureQuery}', pictureQuery);
    }

    private featureReducer(acc: EtymologyFeature[], row: Record<string, SparqlResponseBindingValue>): EtymologyFeature[] {
        if (!row.location?.value) {
            logErrorMessage("Invalid response from Wikidata (no location)", "warning", row);
            return acc;
        }

        const wkt_geometry = row.location.value,
            geometry = parseWKT(wkt_geometry) as Point | null;
        if (!geometry) {
            if (process.env.NODE_ENV === 'development') console.debug("Failed to parse WKT coordinates", { wkt_geometry, row });
            return acc;
        }

        const feature_wd_id: string | undefined = row.item?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
            etymology_wd_id: string | undefined = row.etymology?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
            existingFeature = acc.find(feature => {
                if (feature.id !== feature_wd_id)
                    return false; // Not the same feature

                //console.info("Checking feature for merging", { wd_id: feature.id, feature_wd_id, geom: feature.geometry, geometry });
                if (feature_wd_id)
                    return true; // Both features have the same Wikidata ID

                // Both features have no Wikidata ID, check if they have the same coordinates
                return feature.geometry.type === "Point" && feature.geometry.coordinates[0] === geometry.coordinates[0] && feature.geometry.coordinates[1] === geometry.coordinates[1];
            });

        if (etymology_wd_id && existingFeature && getEtymologies(existingFeature)?.some(etymology => etymology.wikidata === etymology_wd_id)) {
            if (process.env.NODE_ENV === 'development') console.warn("Wikidata: Ignoring duplicate etymology", { wd_id: etymology_wd_id, existing: existingFeature.properties, new: row });
        } else {
            const etymology: Etymology | null = etymology_wd_id ? {
                from_osm: false,
                from_wikidata: true,
                from_wikidata_entity: row.from_entity?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
                from_wikidata_prop: row.from_prop?.value?.replace(WikidataService.WD_PROPERTY_PREFIX, ""),
                propagated: false,
                wikidata: etymology_wd_id,
            } : null;

            if (!existingFeature) { // Add the new feature for this item 
                let osm_id: number | undefined,
                    osm_type: "node" | "way" | "relation" | undefined;
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

                let render_height;
                if (row.height?.value)
                    render_height = parseInt(row.height?.value);
                else if (row.levels?.value)
                    render_height = parseInt(row.levels?.value) * 4;
                else if (row.building?.value)
                    render_height = 6;

                acc.push({
                    type: "Feature",
                    id: feature_wd_id,
                    geometry,
                    properties: {
                        commons: row.commons?.value,
                        description: row.itemDescription?.value,
                        etymologies: etymology ? [etymology] : undefined,
                        from_osm: false,
                        from_wikidata: true,
                        from_wikidata_entity: feature_wd_id ? feature_wd_id : etymology?.from_wikidata_entity,
                        from_wikidata_prop: feature_wd_id ? "P625" : etymology?.from_wikidata_prop,
                        name: row.itemLabel?.value,
                        osm_id,
                        osm_type,
                        picture: row.picture?.value,
                        render_height: render_height,
                        wikidata: feature_wd_id,
                        wikidata_alias: row.alias?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
                        wikipedia: row.wikipedia?.value,
                    }
                });
            } else if (etymology) { // Add the new etymology to the existing feature for this feature
                getEtymologies(existingFeature)?.push(etymology);
            }
        }
        return acc;
    }
}