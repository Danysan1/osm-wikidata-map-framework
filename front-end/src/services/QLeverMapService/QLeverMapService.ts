import type { BBox, Point } from "geojson";
import { parse as parseWKT } from "wellknown";
import type { MapDatabase } from "../../db/MapDatabase";
import { SparqlApi } from "../../generated/sparql/apis/SparqlApi";
import type { SparqlBackend } from "../../generated/sparql/models/SparqlBackend";
import type { SparqlResponseBindingValue } from "../../generated/sparql/models/SparqlResponseBindingValue";
import { Configuration } from "../../generated/sparql/runtime";
import type { Etymology, OsmType } from "../../model/Etymology";
import { getFeatureLinkedEntities, osmKeyToKeyID, type OwmfFeature, type OwmfResponse } from "../../model/OwmfResponse";
import { SourcePreset } from "../../model/SourcePreset";
import type { MapService } from "../MapService";
import { WikidataService } from "../WikidataService";
import osm_all_query from "./osm_all.sparql";
import osm_wd_query from "./osm_wd.sparql";
import osm_wd_base_query from "./osm_wd_base.sparql";
import osm_wd_direct_query from "./osm_wd_direct.sparql";
import osm_wd_reverse_query from "./osm_wd_reverse.sparql";
import wd_base_query from "./wd_base.sparql";
import wd_direct_query from "./wd_direct.sparql";
import wd_indirect_query from "./wd_indirect.sparql";
import wd_qualifier_query from "./wd_qualifier.sparql";
import wd_reverse_query from "./wd_reverse.sparql";

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
    private readonly preset: SourcePreset;
    private readonly osmTextKey?: string;
    private readonly osmDescriptionKey?: string;
    private readonly maxElements?: number;
    private readonly osmWikidataKeys?: string[];
    private readonly osmFilterTags?: string[];
    private readonly db?: MapDatabase;
    private readonly baseBBox?: BBox;
    private readonly api: SparqlApi;

    public constructor(
        preset: SourcePreset,
        osmTextKey?: string,
        osmDescriptionKey?: string,
        maxElements?: number,
        maxRelationMembers?: number,
        osmWikidataKeys?: string[],
        osmFilterTags?: string[],
        db?: MapDatabase,
        bbox?: BBox,
        basePath = 'https://qlever.cs.uni-freiburg.de/api'
    ) {
        this.preset = preset;
        this.osmTextKey = osmTextKey;
        this.osmDescriptionKey = osmDescriptionKey;
        this.maxElements = maxElements;
        this.osmWikidataKeys = osmWikidataKeys;
        this.osmFilterTags = osmFilterTags;
        this.db = db;
        this.baseBBox = bbox;
        this.api = new SparqlApi(new Configuration({
            basePath,
            // headers: { "User-Agent": "OSM-Wikidata-Map-Framework" }
        }));

        console.debug("QLeverMapService currently ignores maxRelationMembers", { osmTextKey, osmDescriptionKey, maxElements, maxRelationMembers, osmWikidataKeys, osmFilterTags, basePath });
    }

    public canHandleBackEnd(backEndID: string): boolean {
        return /^qlever_(wd_(base|direct|indirect|reverse|qualifier)(_P\d+)?)|(osm_[_a-z]+)$/.test(backEndID);
    }

    public async fetchMapElements(backEndID: string, onlyCentroids: boolean, bbox: BBox, language: string, year: number): Promise<OwmfResponse> {
        if (this.baseBBox && (bbox[2] < this.baseBBox[0] || bbox[3] < this.baseBBox[1] || bbox[0] > this.baseBBox[2] || bbox[1] > this.baseBBox[3])) {
            console.warn("QLever fetchMapElements: request bbox does not overlap with the instance bbox", { bbox, baseBBox: this.baseBBox });
            return { type: "FeatureCollection", features: [] };
        }

        const cachedResponse = await this.db?.getMap(this.preset.id, backEndID, onlyCentroids, bbox, language, year);
        if (cachedResponse)
            return cachedResponse;

        const backend = this.getSparqlBackEnd(backEndID),
            sparqlQueryTemplate = await this.getSparqlQueryTemplate(backEndID),
            sparqlQuery = this.fillPlaceholders(backEndID, onlyCentroids, sparqlQueryTemplate, bbox)
                .replaceAll('${language}', language)
                .replaceAll('${limit}', this.maxElements ? "LIMIT " + this.maxElements : ""),
            // TODO Filter by date
            ret = await this.api.postSparqlQuery({ backend, format: "json", query: sparqlQuery });

        if (!ret.results?.bindings)
            throw new Error("Invalid response from Wikidata (no bindings)");

        const out: OwmfResponse = {
            type: "FeatureCollection",
            bbox: bbox,
            features: ret.results.bindings.reduce(this.featureReducer, []),
            timestamp: new Date().toISOString(),
            sourcePresetID: this.preset.id,
            backEndID: backEndID,
            onlyCentroids: onlyCentroids,
            language: language,
            year: year,
            truncated: ret.results.bindings.length === this.maxElements,
        };
        out.total_entity_count = out.features.reduce((acc, feature) => acc + (feature.properties?.linked_entity_count ?? 0), 0);
        if (backend === "wikidata")
            out.qlever_wd_query = sparqlQuery;
        else if (backend === "osm-planet")
            out.qlever_osm_query = sparqlQuery;

        console.debug(`QLever fetchMapElements found ${out.features.length} features with ${out.total_entity_count} linked entities from ${ret.results.bindings.length} rows`, out);
        void this.db?.addMap(out);
        return out;
    }

    private getSparqlBackEnd(backEnd: string): SparqlBackend {
        return backEnd.startsWith("qlever_osm_") ? "osm-planet" : "wikidata";
    }

    private async getSparqlQueryTemplate(backEndID: string) {
        let queryURL: string;
        if (backEndID === "qlever_osm_wd")
            queryURL = osm_wd_query;
        else if (backEndID === "qlever_osm_wd_base")
            queryURL = osm_wd_base_query;
        else if (backEndID === "qlever_osm_wikidata_direct")
            queryURL = osm_wd_direct_query;
        else if (backEndID === "qlever_osm_wikidata_reverse")
            queryURL = osm_wd_reverse_query;
        else if (/^qlever_osm_[^w]/.test(backEndID))
            queryURL = osm_all_query;
        else if (backEndID === "qlever_wd_base")
            queryURL = wd_base_query;
        else if (backEndID.startsWith("qlever_wd_direct"))
            queryURL = wd_direct_query;
        else if (backEndID === "qlever_wd_indirect")
            queryURL = wd_indirect_query;
        else if (backEndID === "qlever_wd_reverse")
            queryURL = wd_reverse_query;
        else if (backEndID === "qlever_wd_qualifier")
            queryURL = wd_qualifier_query;
        else
            throw new Error(`Invalid QLever back-end ID: "${backEndID}"`);

        return await fetch(queryURL).then(response => response.text());
    }

    private fillPlaceholders(backEndID: string, onlyCentroids: boolean, sparqlQuery: string, bbox: BBox): string {
        // TODO Use onlyCentroids
        if (backEndID.includes("osm")) {
            const selected_key_id = /^qlever_osm_[^w]/.test(backEndID) ? backEndID.replace("qlever_", "") : null,
                all_osm_wikidata_keys_selected = !selected_key_id || selected_key_id.startsWith("osm_all"),
                osm_text_key = all_osm_wikidata_keys_selected ? this.osmTextKey : undefined,
                osm_description_key = all_osm_wikidata_keys_selected ? this.osmDescriptionKey : undefined,
                selected_osm_wikidata_keys = all_osm_wikidata_keys_selected ? this.osmWikidataKeys : this.osmWikidataKeys?.filter(key => osmKeyToKeyID(key) === selected_key_id);
            if (this.osmWikidataKeys?.length && !selected_osm_wikidata_keys?.length)
                throw new Error(`Invalid selected_key_id: ${backEndID} => ${selected_key_id} not in osmWikidataKeys`);

            const filter_tags = this.osmFilterTags?.map(tag => tag.replace("=*", "")),
                filter_tags_with_value = filter_tags?.filter(tag => tag.includes("=")),
                filter_keys = filter_tags?.filter(tag => !tag.includes("=")),
                filter_osm_wd_keys = filter_tags?.length ? selected_osm_wikidata_keys?.filter(key => filter_tags.includes(key)) : selected_osm_wikidata_keys,
                non_filter_osm_wd_keys = selected_osm_wikidata_keys?.filter(key => !filter_keys?.includes(key)),
                filter_non_etymology_keys = filter_keys?.filter(key => key !== osm_text_key && key !== osm_description_key && !this.osmWikidataKeys?.includes(key)),
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

        const wikidataCountry = process.env.owmf_wikidata_country,
            wikidataCountryQuery = wikidataCountry ? `?item wdt:P17 wd:${wikidataCountry}.` : '',
            osmCountry = process.env.owmf_osm_country,
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

    private featureReducer(this: void, acc: OwmfFeature[], row: Record<string, SparqlResponseBindingValue>): OwmfFeature[] {
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

        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        (etymology_wd_ids || [undefined]).forEach(etymology_wd_id => { // [undefined] is used when there are no linked entities (like in https://osmwd.dsantini.it )
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
                const feature_from_osm = row.from_osm?.value === 'true' || (row.from_osm?.value === undefined && !!row.osm?.value),
                    feature_from_wikidata = row.from_wikidata?.value === 'true' || (row.from_wikidata?.value === undefined && !!row.item?.value);
                
                let osm_id: number | undefined,
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
                    const splits = /^https:\/\/www.openstreetmap.org\/([a-z]+)\/([0-9]+)$/.exec(row.osm.value);
                    if (splits?.length === 3) {
                        osm_type = splits[1] as OsmType;
                        osm_id = parseInt(splits[2]);
                    }
                }
                
                const etymology: Etymology | null = etymology_wd_id ? {
                        from_osm: feature_from_osm,
                        from_osm_type: osm_type,
                        from_osm_id: osm_id,
                        from_wikidata: feature_from_wikidata,
                        from_wikidata_entity: row.from_entity?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
                        from_wikidata_prop: row.from_prop?.value?.replace(WikidataService.WD_PROPERTY_WDT_PREFIX, "")?.replace(WikidataService.WD_PROPERTY_P_PREFIX, ""),
                        propagated: false,
                        statementEntity: row.statementEntity?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
                        wikidata: etymology_wd_id,
                    } : null;

                if (!existingFeature) { // Add the new feature for this item 
                    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                    const commons = row.commons?.value || (typeof row.wikimedia_commons?.value === "string" ? commonsCategoryRegex.exec(row.wikimedia_commons.value)?.at(1) : undefined),
                        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                        picture = row.picture?.value || (typeof row.wikimedia_commons?.value === "string" ? commonsFileRegex.exec(row.wikimedia_commons.value)?.at(1) : undefined) || (typeof row.image?.value === "string" ? commonsFileRegex.exec(row.image.value)?.at(1) : undefined);
                    console.debug("featureReducer", { row, osm_id, osm_type, commons, picture });

                    let render_height;
                    if (row.height?.value)
                        render_height = parseInt(row.height?.value);
                    else if (row.levels?.value)
                        render_height = parseInt(row.levels?.value) * 4;
                    else if (row.building?.value)
                        render_height = 6;

                    const from_wikidata_entity = feature_wd_id ? feature_wd_id : etymology?.from_wikidata_entity,
                        from_wikidata_prop = feature_wd_id ? "P625" : etymology?.from_wikidata_prop;
                    let id;
                    if (feature_from_osm && feature_from_wikidata)
                        id = "osm.org/" + osm_type + "/" + osm_id + "_wikidata.org/" + from_wikidata_entity + "/" + from_wikidata_prop;
                    else if (feature_from_osm)
                        id = "osm.org/" + osm_type + "/" + osm_id;
                    else
                        id = "wikidata.org/" + from_wikidata_entity + "/" + from_wikidata_prop;

                    acc.push({
                        type: "Feature",
                        id,
                        geometry,
                        properties: {
                            commons: commons,
                            linked_entities: etymology ? [etymology] : undefined,
                            linked_entity_count: (etymology ? 1 : 0) + (row.etymology_text?.value ? 1 : 0),
                            text_etymology: row.etymology_text?.value,
                            text_etymology_descr: row.etymology_description?.value,
                            from_osm: feature_from_osm,
                            from_wikidata: feature_from_wikidata,
                            from_wikidata_entity,
                            from_wikidata_prop,
                            render_height: render_height,
                            tags: {
                                description: row.itemDescription?.value,
                                name: row.itemLabel?.value,
                                website: row.website?.value,
                            },
                            osm_id,
                            osm_type,
                            picture: picture,
                            wikidata: feature_wd_id,
                            wikipedia: row.wikipedia?.value,
                        }
                    });
                } else if (etymology) { // Add the new etymology to the existing feature for this feature
                    getFeatureLinkedEntities(existingFeature)?.push(etymology);
                }
            }
        });
        return acc;
    }
}