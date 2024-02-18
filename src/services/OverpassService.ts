import { getConfig, getKeyID, getStringArrayConfig } from "../config";
import type { BBox } from "geojson";
import { Configuration } from "../generated/overpass/runtime";
import { OverpassApi } from "../generated/overpass/apis/OverpassApi";
import osmtogeojson from "osmtogeojson";
import type { MapService } from "./MapService";
import type { Etymology } from "../model/Etymology";
import type { EtymologyFeature, EtymologyResponse } from "../model/EtymologyResponse";
import type { OsmType } from "../model/Etymology";
import type { MapDatabase } from "../db/MapDatabase";

const commonsCategoryRegex = /(Category:[^;]+)/;
const commonsFileRegex = /(File:[^;]+)/;

export class OverpassService implements MapService {
    private db?: MapDatabase;
    private api: OverpassApi;
    private wikidata_keys?: string[];
    private wikidata_key_codes?: Record<string, string>;

    public constructor(db?: MapDatabase) {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        const endpoints = getStringArrayConfig("overpass_endpoints") || ["https://overpass-api.de/api"],
            randomIndex = Math.floor(Math.random() * endpoints.length),
            basePath = endpoints[randomIndex];
        this.db = db;
        this.api = new OverpassApi(new Configuration({ basePath }));
        this.wikidata_keys = getStringArrayConfig("osm_wikidata_keys");
        this.wikidata_key_codes = this.wikidata_keys?.reduce((acc: Record<string, string>, key) => {
            acc[getKeyID(key)] = key;
            return acc;
        }, {});
        if (process.env.NODE_ENV === 'development') console.debug("OverpassService initialized", { wikidata_keys: this.wikidata_keys, wikidata_key_codes: this.wikidata_key_codes });
    }

    public canHandleBackEnd(backEndID: string): boolean {
        if (!/^overpass_(wd|all_wd|all|osm_[_a-z]+)$/.test(backEndID))
            return false;

        return true;
    }

    public async fetchMapElements(backEndID: string, onlyCentroids: boolean, bbox: BBox, language: string): Promise<EtymologyResponse> {
        const cachedResponse = await this.db?.getMap(backEndID, onlyCentroids, bbox, language);
        if (cachedResponse)
            return cachedResponse;

        const out = await this.fetchMapData(backEndID, onlyCentroids, bbox, language);
        if (!onlyCentroids) {
            out.features = out.features.filter(
                (feature: EtymologyFeature) => !!feature.properties?.etymologies?.length || !!feature.properties?.text_etymology?.length || (feature.properties?.wikidata && backEndID.endsWith("_wd"))
            );
            out.etymology_count = out.features.reduce((acc, feature) => acc + (feature.properties?.etymologies?.length ?? 0), 0);
        }

        if (process.env.NODE_ENV === 'development') console.debug(`Overpass fetchMapElements found ${out.features.length} features with ${out.etymology_count} etymologies after filtering`, out);
        void this.db?.addMap(out);
        return out;
    }

    private async fetchMapData(backEndID: string, onlyCentroids: boolean, bbox: BBox, language: string): Promise<EtymologyResponse> {
        const osm_text_key = getConfig("osm_text_key"),
            osm_description_key = getConfig("osm_description_key");
        let osm_keys: string[],
            use_wikidata: boolean,
            search_text_key = osm_text_key;

        if (backEndID.includes("overpass_wd")) {
            // Search only elements with wikidata=*
            osm_keys = [];
            search_text_key = null;
            use_wikidata = true;
        } else if (!this.wikidata_keys) {
            throw new Error(`No Wikidata keys configured, invalid Overpass back-end ID: "${this.wikidata_keys}"`)
        } else if (backEndID.includes("overpass_all_wd")) {
            // Search all elements with an etymology (all wikidata_keys) and/or with wikidata=*
            osm_keys = this.wikidata_keys;
            use_wikidata = true;
        } else if (backEndID.includes("overpass_all")) {
            // Search all elements with an etymology
            osm_keys = this.wikidata_keys;
            use_wikidata = false;
        } else {
            // Search a specific etymology key
            const sourceKeyCode = /^.*overpass_(osm_[_a-z]+)$/.exec(backEndID)?.at(1);

            if (process.env.NODE_ENV === 'development') console.debug("Overpass fetchMapData", { backEndID, sourceKeyCode, wikidata_key_codes: this.wikidata_key_codes });
            if (!sourceKeyCode)
                throw new Error(`Failed to extract sourceKeyCode from back-end ID: "${backEndID}"`);
            else if (!this.wikidata_key_codes || !(sourceKeyCode in this.wikidata_key_codes))
                throw new Error(`Invalid Overpass back-end ID: "${backEndID}"`);
            else
                osm_keys = [this.wikidata_key_codes[sourceKeyCode]];

            search_text_key = null;
            use_wikidata = false;
        }

        if (process.env.NODE_ENV === 'development') console.time("overpass_query");
        const query = this.buildOverpassQuery(osm_keys, bbox, search_text_key, use_wikidata, onlyCentroids),
            res = await this.api.postOverpassQuery({ data: query });
        if (process.env.NODE_ENV === 'development') console.timeEnd("overpass_query");
        if (process.env.NODE_ENV === 'development') console.debug(`Overpass fetchMapData found ${res.elements?.length} ELEMENTS`, res.elements);

        if (!res.elements && res.remark)
            throw new Error(`Overpass API error: ${res.remark}`);

        if (process.env.NODE_ENV === 'development') console.time("overpass_transform");
        const out: EtymologyResponse = osmtogeojson(res);
        if (process.env.NODE_ENV === 'development') console.debug(`Overpass fetchMapData found ${out.features.length} FEATURES BEFORE filtering:`, out.features);

        out.features.forEach(f => this.transformFeature(f, osm_keys, osm_text_key, osm_description_key, language));
        out.overpass_query = query;
        out.timestamp = new Date().toISOString();
        out.bbox = bbox;
        out.backEndID = backEndID;
        out.onlyCentroids = onlyCentroids;
        out.language = language;
        const maxElements = getConfig("max_map_elements");
        out.truncated = !!maxElements && res.elements?.length === parseInt(maxElements);
        if (process.env.NODE_ENV === 'development') console.timeEnd("overpass_transform");
        if (process.env.NODE_ENV === 'development') console.debug(`Overpass fetchMapData found ${out.features.length} FEATURES AFTER filtering:`, out.features);

        return out;
    }

    private transformFeature(feature: EtymologyFeature, osm_keys: string[], osm_text_key: string | null, osm_description_key: string | null, language: string) {
        if (!feature.properties)
            feature.properties = {};

        feature.properties.from_osm = true;
        feature.properties.from_wikidata = false;

        const full_osm_id = typeof feature.properties.id === "string" && feature.properties.id.includes("/") ? feature.properties.id : undefined,
            osm_type = full_osm_id?.split("/")?.[0],
            osm_id = full_osm_id ? parseInt(full_osm_id?.split("/")[1]) : undefined;
        feature.properties.osm_id = osm_id;
        feature.properties.osm_type = osm_type ? osm_type as OsmType : undefined;

        if (typeof feature.properties.height === "string")
            feature.properties.render_height = parseInt(feature.properties.height);
        else if (typeof feature.properties["building:levels"] === "string")
            feature.properties.render_height = parseInt(feature.properties["building:levels"]) * 4;
        else if (feature.properties.building)
            feature.properties.render_height = 6;

        const text_ety = osm_text_key ? feature.properties[osm_text_key] : undefined;
        if (typeof text_ety === "string")
            feature.properties.text_etymology = text_ety;

        if (typeof feature.properties.website === "string")
            feature.properties.website_url = feature.properties.website;

        const descr = osm_description_key ? feature.properties[osm_description_key] : undefined;
        if (typeof descr === "string")
            feature.properties.text_etymology_descr = descr;

        if (typeof feature.properties.wikimedia_commons === "string")
            feature.properties.commons = commonsCategoryRegex.exec(feature.properties.wikimedia_commons)?.at(1);

        if (typeof feature.properties.wikimedia_commons === "string")
            feature.properties.picture = commonsFileRegex.exec(feature.properties.wikimedia_commons)?.at(1);
        else if (typeof feature.properties.image === "string")
            feature.properties.picture = commonsFileRegex.exec(feature.properties.image)?.at(1);

        const nameKey = "name:" + language,
            name = feature.properties[nameKey];
        if (typeof name === "string")
            feature.properties.name = name;
        // Default language is intentionally not used as it could overwrite a more specific language in name=*

        feature.properties.etymologies = osm_keys
            .map(key => feature.properties?.[key])
            .flatMap(value => typeof value === "string" ? value.split(";") : undefined)
            .filter(value => value && /^Q[0-9]+/.test(value))
            .map<Etymology>(value => ({
                from_osm: true,
                from_osm_id: osm_id,
                from_osm_type: feature.properties?.osm_type,
                from_wikidata: false,
                propagated: false,
                wikidata: value
            }));
    }

    private buildOverpassQuery(
        wd_keys: string[], bbox: BBox, osm_text_key: string | null, use_wikidata: boolean, onlyCentroids: boolean
    ): string {
        // See https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/CONTRIBUTING.md#user-content-excluded-elements
        const maxRelationMembers = getConfig("max_relation_members"),
            maxMembersFilter = maxRelationMembers ? `(if:count_members()<${maxRelationMembers})` : "",
            notTooBig = `[!"end_date"][!"sqkm"][!"boundary"]["type"!="boundary"]["route"!="historic"]${maxMembersFilter}`,
            filter_tags = getStringArrayConfig("osm_filter_tags")?.map(tag => tag.replace("=*", "")),
            text_etymology_key_is_filter = osm_text_key && (!filter_tags || filter_tags.includes(osm_text_key)),
            filter_wd_keys = filter_tags ? wd_keys.filter(key => filter_tags.includes(key)) : wd_keys,
            non_filter_wd_keys = wd_keys.filter(key => !filter_tags?.includes(key));
        if (process.env.NODE_ENV === 'development') console.debug("buildOverpassQuery", { filter_wd_keys, wd_keys, filter_tags, non_filter_wd_keys, osm_text_key });
        let query = `
[out:json][timeout:40][bbox:${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]}];
(
// Filter tags: ${filter_tags?.length ? filter_tags.join(", ") : "NONE"}
// Secondary Wikidata keys: ${wd_keys.length ? wd_keys.join(", ") : "NONE"}
// Text key: ${osm_text_key ?? "NONE"}
// ${use_wikidata ? "F" : "NOT f"}etching also elements with wikidata=*
// Max relation members: ${maxRelationMembers ?? "UNLIMITED"}
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

        const maxElements = getConfig("max_map_elements"),
            outClause = onlyCentroids ? `out ids center ${maxElements};` : `out body ${maxElements}; >; out skel qt;`;
        query += `);
// Max elements: ${maxElements ?? "NONE"}
${outClause}
`;

        return query;
    }
}