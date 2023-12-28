import { WikidataService } from "./WikidataService";
import osm_wd_query from "./query/qlever/osm_wd.sparql";
import osm_all_query from "./query/qlever/osm_all.sparql";
import osm_wd_base_query from "./query/qlever/osm_wd_base.sparql";
import osm_wd_direct_query from "./query/qlever/osm_wd_direct.sparql";
import osm_wd_reverse_query from "./query/qlever/osm_wd_reverse.sparql";
import wd_indirect_query from "./query/qlever/wd_indirect.sparql";
import wd_reverse_query from "./query/qlever/wd_reverse.sparql";
import wd_qualifier_query from "./query/qlever/wd_qualifier.sparql";
import wd_direct_query from "./query/qlever/wd_direct.sparql";
import wd_base_query from "./query/qlever/wd_base.sparql";
import { debug, getConfig, getJsonConfig, getKeyID } from "../config";
import { parse as parseWKT } from "wellknown";
import { Feature as GeoJsonFeature, GeoJSON, GeoJsonProperties, Point, BBox } from "geojson";
import { ElementResponse, Etymology, EtymologyFeature, EtymologyResponse } from "../generated/owmf";
import { logErrorMessage } from "../monitoring";
import { MapDatabase } from "../db/MapDatabase";
import { MapService } from "./MapService";
import { Configuration, SparqlApi, SparqlBackend } from "../generated/sparql";

export type Feature = GeoJsonFeature<Point, GeoJsonProperties> & EtymologyFeature;
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

export class QLeverMapService implements MapService {
    public static readonly WD_ENTITY_PREFIX = "http://www.wikidata.org/entity/";
    public static readonly WD_PROPERTY_PREFIX = "http://www.wikidata.org/prop/direct/";
    private api: SparqlApi;
    private db: MapDatabase;

    constructor(db: MapDatabase, basePath = 'https://qlever.cs.uni-freiburg.de/api') {
        this.api = new SparqlApi(new Configuration({ basePath }));
        this.db = db;
    }

    canHandleSource(sourceID: string): boolean {
        return /^qlever_(wd_(base|direct|indirect|reverse|qualifier)(_P\d+)?)|(osm_[_a-z]+)$/.test(sourceID);
    }

    public fetchMapClusterElements(sourceID: string, bbox: BBox): Promise<GeoJSON & ElementResponse> {
        return this.fetchMapData(sourceID, bbox);
    }

    public fetchMapElementDetails(sourceID: string, bbox: BBox): Promise<GeoJSON & EtymologyResponse> {
        return this.fetchMapData(sourceID, bbox);
    }

    private async fetchMapData(sourceID: string, bbox: BBox): Promise<GeoJSON & EtymologyResponse> {
        const language = document.documentElement.lang.split('-').at(0) || '';
        let out = await this.db.getMap(sourceID, bbox, language);
        if (out) {
            if (debug) console.info(`QLever map cache hit, using cached response with ${out.features.length} features`, { sourceID, bbox, language: language, out });
        } else {
            if (debug) console.info("QLever map cache miss, fetching data", { sourceID, bbox, language: language });
            const maxElements = getConfig("max_map_elements"),
                backend = this.getBackend(sourceID),
                sparqlQueryTemplate = this.getSparqlQueryTemplate(sourceID),
                sparqlQuery = this.fillPlaceholders(sourceID, sparqlQueryTemplate, bbox)
                    .replaceAll('${language}', language || '')
                    .replaceAll('${limit}', maxElements ? "LIMIT " + maxElements : ""),
                ret = await this.api.postSparqlQuery({ backend, format: "json", query: sparqlQuery });

            if (!ret.results?.bindings)
                throw new Error("Invalid response from Wikidata (no bindings)");

            out = {
                type: "FeatureCollection",
                bbox: bbox,
                features: ret.results.bindings.reduce(this.featureReducer, []),
                timestamp: new Date().toISOString(),
                sourceID: sourceID,
                language: language,
                truncated: !!maxElements && ret.results.bindings.length === parseInt(maxElements),
            };
            out.etymology_count = out.features.reduce((acc, feature) => acc + (feature.properties?.etymologies?.length || 0), 0);
            if (backend === "wikidata")
                out.qlever_wd_query = sparqlQuery;
            else if (backend === "osm-planet")
                out.qlever_osm_query = sparqlQuery;

            if (debug) console.info(`QLever fetchMapData found ${out.features.length} features with ${out.etymology_count} etymologies from ${ret.results.bindings.length} rows`, out);
            this.db.addMap(out);
        }
        return out;
    }

    private getBackend(sourceID: string): SparqlBackend {
        return sourceID.startsWith("qlever_osm_") ? "osm-planet" : "wikidata";
    }

    private getSparqlQueryTemplate(sourceID: string): string {
        if (sourceID === "qlever_osm_wd")
            return osm_wd_query;
        else if (sourceID === "qlever_osm_wd_base")
            return osm_wd_base_query;
        else if (sourceID === "qlever_osm_wikidata_direct")
            return osm_wd_direct_query;
        else if (sourceID === "qlever_osm_wikidata_reverse")
            return osm_wd_reverse_query;
        else if (/^qlever_osm_[^w]/.test(sourceID))
            return osm_all_query;
        else if (sourceID === "qlever_wd_base")
            return wd_base_query;
        else if (sourceID.startsWith("qlever_wd_direct"))
            return wd_direct_query;
        else if (sourceID === "qlever_wd_indirect")
            return wd_indirect_query;
        else if (sourceID === "qlever_wd_reverse")
            return wd_reverse_query;
        else if (sourceID === "qlever_wd_qualifier")
            return wd_qualifier_query;
        else
            throw new Error(`Invalid QLever sourceID: "${sourceID}"`);
    }

    private fillPlaceholders(sourceID: string, sparqlQuery: string, bbox: BBox): string {
        if (sourceID.includes("osm")) {
            const selected_key_id = /^qlever_osm_[^w]/.test(sourceID) ? sourceID.replace("qlever_", "") : null,
                all_osm_wikidata_keys_selected = !selected_key_id || selected_key_id.startsWith("osm_all"),
                osm_text_key = all_osm_wikidata_keys_selected ? getConfig("osm_text_key") : undefined,
                osm_description_key = all_osm_wikidata_keys_selected ? getConfig("osm_description_key") : undefined,
                osm_wikidata_keys = getJsonConfig("osm_wikidata_keys") as string[] | undefined,
                raw_filter_tags: string[] | null = getJsonConfig("osm_filter_tags"),
                selected_osm_wikidata_keys = all_osm_wikidata_keys_selected ? osm_wikidata_keys : osm_wikidata_keys?.filter(key => getKeyID(key) === selected_key_id);
            if (osm_wikidata_keys?.length && !selected_osm_wikidata_keys?.length)
                throw new Error(`Invalid selected_key_id: ${sourceID} => ${selected_key_id} not in ${osm_wikidata_keys}`);

            const filter_tags = raw_filter_tags?.map(tag => tag.replace("=*", "")),
                filter_tags_with_value = filter_tags?.filter(tag => tag.includes("=")),
                filter_keys = filter_tags?.filter(tag => !tag.includes("=")),
                filter_osm_wd_keys = filter_tags?.length ? selected_osm_wikidata_keys?.filter(key => filter_tags.includes(key)) : selected_osm_wikidata_keys,
                non_filter_osm_wd_keys = selected_osm_wikidata_keys?.filter(key => !filter_keys?.includes(key)),
                filter_non_etymology_keys = filter_keys?.filter(key => key !== osm_text_key && key !== osm_description_key && !osm_wikidata_keys?.includes(key)),
                filterKeysExpression = filter_non_etymology_keys?.length ? filter_non_etymology_keys.map(keyPredicate)?.join('|') + " ?_v; " : "", // "[]" would be more appropriate than "?_v", but it's not working by QLever
                non_filter_osm_wd_predicate = non_filter_osm_wd_keys?.map(keyPredicate)?.join('|'),
                osmEtymologyUnionBranches: string[] = [];
            if (debug) console.debug("fillPlaceholders", {
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

        if (sourceID.includes("indirect") || sourceID.includes("reverse") || sourceID.includes("qualifier")) {
            const indirectProperty = getConfig("wikidata_indirect_property");
            if (!indirectProperty)
                throw new Error("No indirect property defined");
            const imageProperty = getConfig("wikidata_image_property"),
                pictureQuery = imageProperty ? `OPTIONAL { ?etymology wdt:${imageProperty} ?_picture. }` : '';

            sparqlQuery = sparqlQuery
                .replaceAll('${indirectProperty}', indirectProperty)
                .replaceAll('${pictureQuery}', pictureQuery);
        } else if (sourceID.includes("direct")) {
            let properties: string[];
            const sourceProperty = /_direct_(P\d+)$/.exec(sourceID)?.at(1),
                directProperties = getJsonConfig("osm_wikidata_properties");
            if (!Array.isArray(directProperties) || !directProperties.length)
                throw new Error("Empty direct properties");

            if (!sourceProperty)
                properties = directProperties;
            else if (!directProperties.includes(sourceProperty))
                throw new Error("Invalid sourceProperty: " + sourceProperty);
            else
                properties = [sourceProperty];

            sparqlQuery = sparqlQuery
                .replaceAll('${directProperties}', properties.map(id => "wdt:" + id).join(" "));
        }

        const wikidataCountry = getConfig("wikidata_country"),
            wikidataCountryQuery = wikidataCountry ? `?item wdt:P17 wd:${wikidataCountry}.` : '',
            osmCountry = getConfig("osm_country"),
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

    private featureReducer(acc: Feature[], row: any): Feature[] {
        if (!row.location?.value) {
            logErrorMessage("Invalid response from Wikidata (no location)", "warning", row);
            return acc;
        }

        const wkt_geometry = row.location.value as string,
            geometry = parseWKT(wkt_geometry) as Point | null;
        if (!geometry) {
            if (debug) console.warn("Failed to parse WKT coordinates", { wkt_geometry, row });
            return acc;
        }

        const feature_wd_id: string | undefined = row.item?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
            etymology_wd_ids: string[] | undefined = typeof row.etymology?.value === "string" ? row.etymology.value.split(";").map((id: string) => id.replace(WikidataService.WD_ENTITY_PREFIX, "")) : undefined;

        (etymology_wd_ids || [undefined]).forEach(etymology_wd_id => { // [undefined] is used when there are no linked entities (like in https://osmwd.dsantini.it )
            const existingFeature = acc.find(feature => {
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
                const feature_from_osm = row.from_osm?.value === 'true' || (row.from_osm?.value === undefined && !!row.osm?.value),
                    feature_from_wikidata = row.from_wikidata?.value === 'true' || (row.from_wikidata?.value === undefined && !!row.item?.value),
                    etymology: Etymology | null = etymology_wd_id ? {
                        from_osm: feature_from_osm,
                        from_wikidata: feature_from_wikidata,
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
                    } else if (row.osm?.value) {
                        const splits = /^https:\/\/www.openstreetmap.org\/([a-z]+)\/([0-9]+)$/.exec(row.osm.value);
                        if (splits?.length === 3) {
                            osm_type = splits[1] as "node" | "way" | "relation";
                            osm_id = parseInt(splits[2]);
                        }
                    }

                    const commons: string | undefined = row.commons?.value || (typeof row.wikimedia_commons?.value === "string" ? commonsCategoryRegex.exec(row.wikimedia_commons.value)?.at(1) : undefined),
                        picture: string | undefined = row.picture?.value || (typeof row.wikimedia_commons?.value === "string" ? commonsFileRegex.exec(row.wikimedia_commons.value)?.at(1) : undefined) || (typeof row.image?.value === "string" ? commonsFileRegex.exec(row.image.value)?.at(1) : undefined);
                    if (debug) console.debug("featureReducer", { row, osm_id, osm_type, commons, picture });

                    acc.push({
                        type: "Feature",
                        id: feature_wd_id,
                        geometry,
                        properties: {
                            commons: commons,
                            description: row.itemDescription?.value,
                            etymologies: etymology ? [etymology] : undefined,
                            text_etymology: row.etymology_text?.value,
                            description_etymology: row.etymology_description?.value,
                            from_osm: feature_from_osm,
                            from_wikidata: feature_from_wikidata,
                            from_wikidata_entity: feature_wd_id ? feature_wd_id : etymology?.from_wikidata_entity,
                            from_wikidata_prop: feature_wd_id ? "P625" : etymology?.from_wikidata_prop,
                            render_height: parseInt(row.height?.value) || (parseInt(row.levels?.value) * 4) || row.building?.value ? 6 : 0,
                            name: row.itemLabel?.value,
                            osm_id,
                            osm_type,
                            picture: picture,
                            wikidata: feature_wd_id,
                            wikipedia: row.wikipedia?.value,
                        }
                    });
                } else if (etymology) { // Add the new etymology to the existing feature for this feature
                    existingFeature.properties?.etymologies?.push(etymology);
                }
            }
        });
        return acc;
    }
}