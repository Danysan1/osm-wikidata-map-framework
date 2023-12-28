import { debug, getConfig, getJsonConfig, getKeyID } from "../config";
import { GeoJSON, BBox, Feature as GeoJSONFeature, Geometry, GeoJsonProperties } from "geojson";
import { ElementResponse, Etymology, EtymologyFeature, EtymologyResponse } from "../generated/owmf";
import { Configuration, OverpassApi } from "../generated/overpass";
import { MapDatabase } from "../db/MapDatabase";
import osmtogeojson from "osmtogeojson";
import { MapService } from "./MapService";

type Feature = GeoJSONFeature<Geometry, GeoJsonProperties> & EtymologyFeature;
const commonsCategoryRegex = /(Category:[^;]+)/;
const commonsFileRegex = /(File:[^;]+)/;

export class OverpassService implements MapService {
    private api: OverpassApi;
    private db: MapDatabase;
    private language: string;
    private wikidata_keys?: string[];
    private wikidata_key_codes?: Record<string, string>;

    constructor(db: MapDatabase) {
        const endpoints: string[] = getJsonConfig("overpass_endpoints") || ["https://overpass-api.de/api"],
            randomIndex = Math.floor(Math.random() * endpoints.length),
            basePath = endpoints[randomIndex];
        this.api = new OverpassApi(new Configuration({ basePath }));
        this.language = document.documentElement.lang.split('-').at(0) || getConfig("default_language") || "en";
        this.db = db;
        this.wikidata_keys = getJsonConfig("osm_wikidata_keys") || undefined;
        this.wikidata_key_codes = this.wikidata_keys?.reduce((acc: Record<string, string>, key) => {
            acc[getKeyID(key)] = key;
            return acc;
        }, {});
        if (debug) console.debug("OverpassService initialized", { wikidata_keys: this.wikidata_keys, wikidata_key_codes: this.wikidata_key_codes });
    }

    canHandleSource(sourceID: string): boolean {
        if (!/^overpass_(wd|all_wd|all|osm_[_a-z]+)$/.test(sourceID))
            return false;

        return true;
    }

    fetchMapClusterElements(sourceID: string, bbox: BBox): Promise<GeoJSON & ElementResponse> {
        return this.fetchMapData(
            "out ids center ${maxElements};", "elements-" + sourceID, bbox
        );
    }

    async fetchMapElementDetails(sourceID: string, bbox: BBox): Promise<GeoJSON & EtymologyResponse> {
        const out = await this.fetchMapData(
            "out body ${maxElements}; >; out skel qt;", "details-" + sourceID, bbox
        );
        out.features = out.features.filter(
            (feature: Feature) => feature.properties?.etymologies?.length || feature.properties?.text_etymology || (feature.properties?.wikidata && sourceID.endsWith("_wd"))
        );
        out.etymology_count = out.features.reduce((acc, feature) => acc + (feature.properties?.etymologies?.length || 0), 0);
        if (debug) console.debug(`Overpass fetchMapElementDetails found ${out.features.length} features with ${out.etymology_count} etymologies after filtering`, out);
        return out;
    }

    private async fetchMapData(outClause: string, sourceID: string, bbox: BBox): Promise<GeoJSON & EtymologyResponse> {
        let out = await this.db.getMap(sourceID, bbox, this.language);
        if (out) {
            if (debug) console.debug("Overpass cache hit, using cached response", { sourceID, bbox, language: this.language, out });
        } else {
            if (debug) console.debug("Overpass cache miss, fetching data", { sourceID, bbox, language: this.language });
            const osm_text_key = getConfig("osm_text_key"),
                osm_description_key = getConfig("osm_description_key");
            let osm_keys: string[],
                use_wikidata: boolean,
                search_text_key = osm_text_key;

            if (sourceID.includes("overpass_wd")) {
                // Search only elements with wikidata=*
                osm_keys = [];
                search_text_key = null;
                use_wikidata = true;
            } else if (!this.wikidata_keys) {
                throw new Error(`No Wikidata keys configured, invalid Overpass sourceID: "${this.wikidata_keys}"`)
            } else if (sourceID.includes("overpass_all_wd")) {
                // Search all elements with an etymology (all wikidata_keys) and/or with wikidata=*
                osm_keys = this.wikidata_keys;
                use_wikidata = true;
            } else if (sourceID.includes("overpass_all")) {
                // Search all elements with an etymology
                osm_keys = this.wikidata_keys;
                use_wikidata = false;
            } else {
                // Search a specific etymology key
                const sourceKeyCode = /^.*overpass_(osm_[_a-z]+)$/.exec(sourceID)?.at(1);

                if (debug) console.debug("Overpass fetchMapData", { sourceID, sourceKeyCode, wikidata_key_codes: this.wikidata_key_codes });
                if (!sourceKeyCode)
                    throw new Error(`Failed to extract sourceKeyCode from sourceID: "${sourceID}"`);
                else if (!this.wikidata_key_codes || !(sourceKeyCode in this.wikidata_key_codes))
                    throw new Error(`Invalid Overpass sourceID: "${sourceID}"`);
                else
                    osm_keys = [this.wikidata_key_codes[sourceKeyCode]];

                search_text_key = null;
                use_wikidata = false;
            }

            if (debug) console.time("overpass_query");
            const query = this.buildOverpassQuery(osm_keys, bbox, search_text_key, use_wikidata, outClause),
                res = await this.api.postOverpassQuery({ data: query });
            if (debug) console.timeEnd("overpass_query");
            if (debug) console.debug(`Overpass fetchMapData found ${res.elements?.length} ELEMENTS`, res.elements);

            if (!res.elements && res.remark)
                throw new Error(`Overpass API error: ${res.remark}`);

            if (debug) console.time("overpass_transform");
            out = osmtogeojson(res);
            if (debug) console.debug(`Overpass fetchMapData found ${out.features.length} FEATURES BEFORE filtering:`, out.features);

            out.features.forEach(f => this.transformFeature(f, osm_keys, osm_text_key, osm_description_key));
            out.overpass_query = query;
            out.timestamp = new Date().toISOString();
            out.bbox = bbox;
            out.sourceID = sourceID;
            out.language = this.language;
            const maxElements = getConfig("max_map_elements");
            out.truncated = !!maxElements && res.elements?.length === parseInt(maxElements);
            this.db.addMap(out);
            if (debug) console.timeEnd("overpass_transform");
        }
        if (debug) console.debug(`Overpass fetchMapData found ${out.features.length} FEATURES AFTER filtering:`, out.features);
        return out;
    }

    private transformFeature(feature: Feature, osm_keys: string[], osm_text_key: string | null, osm_description_key: string | null) {
        if (!feature.id && feature.properties?.id)
            feature.id = feature.properties?.id;
        if (!feature.properties)
            feature.properties = {};

        feature.properties.from_osm = true;
        feature.properties.from_wikidata = false;

        const osm_type = feature.properties.id?.split("/")?.[0],
            osm_id = feature.properties.id ? parseInt(feature.properties.id.split("/")[1]) : undefined;
        feature.properties.osm_id = osm_id;
        feature.properties.osm_type = osm_type;
        feature.properties.render_height = parseInt(feature.properties.height) || parseInt(feature.properties["building:levels"]) * 4 || feature.properties.building ? 6 : 0;

        if (osm_text_key)
            feature.properties.text_etymology = feature.properties[osm_text_key];
        if (osm_description_key)
            feature.properties.text_etymology_descr = feature.properties[osm_description_key];

        feature.properties.commons = typeof feature.properties.wikimedia_commons === "string" ? commonsCategoryRegex.exec(feature.properties.wikimedia_commons)?.at(1) : undefined;
        feature.properties.picture = (typeof feature.properties.wikimedia_commons === "string" ? commonsFileRegex.exec(feature.properties.wikimedia_commons)?.at(1) : undefined) || (typeof feature.properties.image === "string" ? commonsFileRegex.exec(feature.properties.image)?.at(1) : undefined);

        if (feature.properties["name:" + this.language])
            feature.properties.name = feature.properties["name:" + this.language];
        // Default language is intentionally not used as it could overwrite a more specific language in name=*

        feature.properties.etymologies = osm_keys
            .map(key => feature.properties?.[key])
            .flatMap((value?: string) => value?.split(";"))
            .filter(value => value && /^Q[0-9]+/.test(value))
            .map<Etymology>(value => ({
                from_osm: true,
                from_osm_id: osm_id,
                from_osm_type: osm_type,
                from_wikidata: false,
                propagated: false,
                wikidata: value
            }));
    }

    private buildOverpassQuery(
        wd_keys: string[], bbox: BBox, osm_text_key: string | null, use_wikidata: boolean, outClause: string
    ): string {
        // See https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/CONTRIBUTING.md#user-content-excluded-elements
        const maxRelationMembers = getConfig("max_relation_members"),
            maxMembersFilter = maxRelationMembers ? `(if:count_members()<${maxRelationMembers})` : "",
            notTooBig = `[!"end_date"][!"sqkm"][!"boundary"]["type"!="boundary"]["route"!="historic"]${maxMembersFilter}`,
            raw_filter_tags: string[] | null = getJsonConfig("osm_filter_tags"),
            filter_tags = raw_filter_tags?.map(tag => tag.replace("=*", "")),
            text_etymology_key_is_filter = osm_text_key && (!filter_tags || filter_tags.includes(osm_text_key)),
            filter_wd_keys = filter_tags ? wd_keys.filter(key => filter_tags.includes(key)) : wd_keys,
            non_filter_wd_keys = wd_keys.filter(key => !filter_tags?.includes(key));
        if (debug) console.debug("buildOverpassQuery", { filter_wd_keys, wd_keys, filter_tags, non_filter_wd_keys, osm_text_key });
        let query = `
[out:json][timeout:40][bbox:${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]}];
(
// Filter tags: ${filter_tags?.length ? filter_tags.join(", ") : "NONE"}
// Secondary Wikidata keys: ${wd_keys.length ? wd_keys.join(", ") : "NONE"}
// Text key: ${osm_text_key || "NONE"}
// ${use_wikidata ? "F" : "NOT f"}etching also elements with wikidata=*
// Max relation members: ${maxRelationMembers || "UNLIMITED"}
`;

        filter_wd_keys.forEach(
            key => query += `nwr${notTooBig}["${key}"]; // filter & secondary wikidata key\n`
        );
        if (text_etymology_key_is_filter)
            query += `nwr${notTooBig}["${osm_text_key}"]; // filter & text etymology key\n`;
        if (use_wikidata && !filter_tags && !osm_text_key)
            query += `nwr${notTooBig}["wikidata"];\n`;

        filter_tags?.forEach(filter_tag => {
            const filter_split = filter_tag.split("="),
                filter_key = filter_split[0],
                filter_value = filter_split[1],
                filter_clause = filter_value ? `"${filter_key}"="${filter_value}"` : `"${filter_key}"`;

            if (!wd_keys.includes(filter_key) && osm_text_key !== filter_key) {
                non_filter_wd_keys.forEach(
                    key => query += `nwr${notTooBig}[${filter_clause}]["${key}"]; // filter + secondary wikidata key\n`
                );
                if (osm_text_key && !text_etymology_key_is_filter)
                    query += `nwr${notTooBig}[${filter_clause}]["${osm_text_key}"]; // filter + text etymology key\n`;
                if (use_wikidata)
                    query += `nwr${notTooBig}[${filter_clause}]["wikidata"]; // filter + wikidata=*\n`;
            }
        });

        const maxElements = getConfig("max_map_elements");
        query += `);
// Max elements: ${getConfig("max_map_elements") || "NONE"}
${outClause.replace("${maxElements}", maxElements || "")}
`;

        return query;
    }
}