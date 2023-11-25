import { WikidataService } from "./WikidataService";
import indirectMapQuery from "./query/map/indirect.sparql";
import reverseMapQuery from "./query/map/reverse.sparql";
import qualifierMapQuery from "./query/map/qualifier.sparql";
import directMapQuery from "./query/map/direct.sparql";
import baseMapQuery from "./query/map/base.sparql";
import { debug, getConfig, getJsonConfig } from "../config";
import { parse as parseWKT } from "wellknown";
import { Feature as GeoJsonFeature, GeoJSON, GeoJsonProperties, Point, BBox } from "geojson";
import { Etymology, EtymologyFeature, EtymologyResponse } from "../generated/owmf";
import { logErrorMessage } from "../monitoring";
import { MapDatabase } from "../db/MapDatabase";

export type Feature = GeoJsonFeature<Point, GeoJsonProperties> & EtymologyFeature;

export class WikidataMapService extends WikidataService {
    protected db: MapDatabase;

    constructor(db: MapDatabase) {
        super();
        this.db = db;
    }

    canHandleSource(sourceID: string): boolean {
        if (!/^wd_(base|direct|indirect|reverse|qualifier)(_P\d+)?$/.test(sourceID))
            return false;

        return true;
    }

    async fetchMapData(sourceID: string, bbox: BBox): Promise<GeoJSON & EtymologyResponse> {
        const language = document.documentElement.lang.split('-').at(0) || '';
        let out = await this.db.getMap(sourceID, bbox, language);
        if (out) {
            if (debug) console.info(`Wikidata map cache hit, using cached response with ${out.features.length} features`, { sourceID, bbox, language: language, out });
        } else {
            if (debug) console.info("Wikidata map cache miss, fetching data", { sourceID, bbox, language: language });
            let sparqlQueryTemplate: string;
            if (sourceID === "wd_base")
                sparqlQueryTemplate = baseMapQuery;
            else if (sourceID.startsWith("wd_direct"))
                sparqlQueryTemplate = this.getDirectSparqlQuery(sourceID);
            else
                sparqlQueryTemplate = this.getIndirectSparqlQuery(sourceID);
            const maxElements = getConfig("max_map_elements"),
                sparqlQuery = sparqlQueryTemplate
                    .replaceAll('${language}', language || '')
                    .replaceAll('${defaultLanguage}', this.defaultLanguage)
                    .replaceAll('${limit}', maxElements ? "LIMIT " + maxElements : "")
                    .replaceAll('${southWestWKT}', `Point(${bbox[0]} ${bbox[1]})`)
                    .replaceAll('${northEastWKT}', `Point(${bbox[2]} ${bbox[3]})`),
                ret = await this.api.postSparqlQuery({ format: "json", query: sparqlQuery });

            if (!ret.results?.bindings)
                throw new Error("Invalid response from Wikidata (no bindings)");

            out = {
                type: "FeatureCollection",
                bbox,
                features: ret.results.bindings.reduce(this.featureReducer, [])
            };
            out.etymology_count = out.features.reduce((acc, feature) => acc + (feature.properties?.etymologies?.length || 0), 0);
            out.wikidata_query = sparqlQuery;
            out.timestamp = new Date().toISOString();
            out.sourceID = sourceID;
            out.language = language;
            out.truncated = !!maxElements && ret.results.bindings.length === parseInt(maxElements);
            if (debug) console.info(`Wikidata fetchMapData found ${out.features.length} features with ${out.etymology_count} etymologies from ${ret.results.bindings.length} rows`, out);
            this.db.addMap(out);
        }
        return out;
    }

    private getDirectSparqlQuery(sourceID: string): string {
        let properties: string[];
        const sourceProperty = /^wd_\w+_(P\d+)$/.exec(sourceID)?.at(1),
            directProperties = getJsonConfig("osm_wikidata_properties"),
            sparqlQueryTemplate = directMapQuery as string;
        if (!Array.isArray(directProperties) || !directProperties.length)
            throw new Error("Empty direct properties");

        if (!sourceProperty)
            properties = directProperties;
        else if (!directProperties.includes(sourceProperty))
            throw new Error("Invalid sourceProperty: " + sourceProperty);
        else
            properties = [sourceProperty];

        return sparqlQueryTemplate.replaceAll('${directProperties}', properties.map(id => "wdt:" + id).join(" "));
    }

    private getIndirectSparqlQuery(sourceID: string): string {
        const indirectProperty = getConfig("wikidata_indirect_property");
        if (!indirectProperty)
            throw new Error("No indirect property defined");

        let sparqlQueryTemplate: string;
        if (sourceID.startsWith("wd_indirect"))
            sparqlQueryTemplate = indirectMapQuery;
        else if (sourceID.startsWith("wd_reverse"))
            sparqlQueryTemplate = reverseMapQuery;
        else if (sourceID.startsWith("wd_qualifier"))
            sparqlQueryTemplate = qualifierMapQuery;
        else
            throw new Error("Invalid sourceID: " + sourceID);

        const imageProperty = getConfig("wikidata_image_property"),
            pictureQuery = imageProperty ? `OPTIONAL { ?etymology wdt:${imageProperty} ?picture. }` : '';
        return sparqlQueryTemplate
            .replaceAll('${indirectProperty}', indirectProperty)
            .replaceAll('${pictureQuery}', pictureQuery);
    }

    private featureReducer(acc: Feature[], row: any): Feature[] {
        if (!row.location?.value) {
            logErrorMessage("Invalid response from Wikidata (no location)", "warning", row);
            return acc;
        }

        const wkt_geometry = row.location.value as string,
            geometry = parseWKT(wkt_geometry) as Point | null;
        if (!geometry) {
            if (debug) console.info("Failed to parse WKT coordinates", { wkt_geometry, row });
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
                return feature.geometry.coordinates[0] === geometry.coordinates[0] && feature.geometry.coordinates[1] === geometry.coordinates[1];
            });

        if (etymology_wd_id && existingFeature?.properties?.etymologies?.some(etymology => etymology.wikidata === etymology_wd_id)) {
            if (debug) console.warn("Wikidata: Ignoring duplicate etymology", { wd_id: etymology_wd_id, existing: existingFeature.properties, new: row });
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
                let osm_id: number | undefined, osm_type: "node" | "way" | "relation" | undefined;
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
                        wikidata: feature_wd_id,
                        wikipedia: row.wikipedia?.value,
                    }
                });
            } else if (etymology) { // Add the new etymology to the existing feature for this feature
                existingFeature.properties?.etymologies?.push(etymology);
            }
        }
        return acc;
    }
}