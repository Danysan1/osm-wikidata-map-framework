import { debug, getConfig, getJsonConfig } from "../config";
import { GeoJSON, BBox, Feature as GeoJSONFeature, Geometry, GeoJsonProperties } from "geojson";
import { ElementResponse, EtymologyFeature, EtymologyResponse } from "../generated/owmf";
import { Configuration, OverpassApi } from "../generated/overpass";
import { MapDatabase } from "../db/MapDatabase";
import osmtogeojson from "osmtogeojson";

type Feature = GeoJSONFeature<Geometry, GeoJsonProperties> & EtymologyFeature;

export class OverpassService {
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
            const keyCode = key.replace(":wikidata", "").replace(":", "_");
            acc[keyCode] = key;
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
            let keys: string[],
                use_wikidata: boolean,
                search_text_key = osm_text_key;

            if (sourceID.endsWith("overpass_wd")) {
                // Search only elements with wikidata=*
                keys = [];
                search_text_key = null;
                use_wikidata = true;
            } else if (!this.wikidata_keys) {
                throw new Error(`No keys configured, invalid sourceID ${this.wikidata_keys}`)
            } else if (sourceID.endsWith("overpass_all_wd")) {
                // Search all elements with an etymology (all wikidata_keys) and/or with wikidata=*
                keys = this.wikidata_keys;
                use_wikidata = true;
            } else if (sourceID.endsWith("overpass_all")) {
                // Search all elements with an etymology
                keys = this.wikidata_keys;
                use_wikidata = false;
            } else {
                // Search a specific etymology key
                const sourceKeyCode = /^.*overpass_osm_([_a-z]+)$/.exec(sourceID)?.at(1);

                if (!sourceKeyCode)
                    throw new Error(`Failed to extract sourceKeyCode from sourceID ${sourceID}`);
                else if (!this.wikidata_key_codes || !(sourceKeyCode in this.wikidata_key_codes))
                    throw new Error(`Invalid sourceID: ${sourceID}`);
                else
                    keys = [this.wikidata_key_codes[sourceKeyCode]];

                search_text_key = null;
                use_wikidata = false;
            }

            if (debug) console.time("overpass_query");
            const query = this.buildOverpassQuery(keys, bbox, search_text_key, use_wikidata, outClause),
                res = await this.api.postOverpassQuery({ data: query });
            if (debug) console.timeEnd("overpass_query");
            if (debug) console.debug(`Overpass fetchMapData found ${res.elements?.length} ELEMENTS`, res.elements);

            if (!res.elements && res.remark)
                throw new Error(`Overpass API error: ${res.remark}`);

            if (debug) console.time("overpass_transform");
            out = osmtogeojson(res);
            if (debug) console.debug(`Overpass fetchMapData found ${out.features.length} FEATURES BEFORE filtering:`, out.features );

            out.features.forEach((feature: Feature) => {
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

                if (osm_text_key)
                    feature.properties.text_etymology = feature.properties[osm_text_key];
                if (osm_description_key)
                    feature.properties.text_etymology_descr = feature.properties[osm_description_key];

                if (typeof feature.properties.wikimedia_commons === "string") {
                    if (feature.properties.wikimedia_commons?.includes("File:"))
                        feature.properties.picture = feature.properties.wikimedia_commons;
                    else
                        feature.properties.commons = feature.properties.wikimedia_commons;
                }

                if (feature.properties["name:" + this.language])
                    feature.properties.name = feature.properties["name:" + this.language];
                // Default language is intentionally not used as it could overwrite a more specific language in name=*

                feature.properties.etymologies = keys
                    .map(key => feature.properties?.[key])
                    .flatMap((value?: string) => value?.split(";"))
                    .filter(value => value && /^Q[0-9]+/.test(value))
                    .map(value => ({
                        from_osm: true,
                        from_osm_id: osm_id,
                        from_osm_type: osm_type,
                        from_wikidata: false,
                        propagated: false,
                        wikidata: value
                    }));
            });
            out.overpass_query = query;
            out.timestamp = new Date().toISOString();
            out.bbox = bbox;
            out.sourceID = sourceID;
            out.language = this.language;
            const maxElements = getConfig("max_map_elements");
            out.truncated = !!maxElements && res.elements?.length === parseInt(maxElements);
            this.db.addMap(out);
        }
        if (debug) console.timeEnd("overpass_transform");
        if (debug) console.debug(`Overpass fetchMapData found ${out.features.length} FEATURES AFTER filtering:`, out.features );
        return out;
    }

    private buildOverpassQuery(
        wd_keys: string[], bbox: BBox, osm_text_key: string | null, use_wikidata: boolean, outClause: string
    ): string {
        let query = `[out:json][timeout:40][bbox:${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]}];\n(\n`;

        // See https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/CONTRIBUTING.md#user-content-excluded-elements
        const maxRelationMembers = getConfig("max_relation_members"),
            maxMembersFilter = maxRelationMembers ? `(if:count_members()<${maxRelationMembers})` : "",
            notTooBig = `[!"end_date"][!"sqkm"][!"boundary"]["type"!="boundary"]["route"!="historic"]["natural"!="peninsula"]["place"!="sea"]["place"!="archipelago"]${maxMembersFilter}`,
            raw_filter_tags: string[] | null = getJsonConfig("osm_filter_tags"),
            filter_tags = raw_filter_tags?.map(tag => tag.replace("=*", "")),
            text_etymology_key_is_filter = osm_text_key && (!filter_tags || filter_tags.includes(osm_text_key)),
            filter_wd_keys = filter_tags ? wd_keys.filter(key => filter_tags.includes(key)) : wd_keys,
            extra_wd_keys = wd_keys.filter(key => !filter_tags?.includes(key));
        if (debug) console.debug("buildOverpassQuery", { filter_wd_keys, wd_keys, filter_tags, extra_wd_keys, osm_text_key });
        filter_wd_keys.forEach(
            key => query += `nwr${notTooBig}["${key}"]; // ${key} is both filter and secondary wikidata key\n`
        );
        if (text_etymology_key_is_filter)
            query += `nwr${notTooBig}["${osm_text_key}"]; // ${osm_text_key} is both filter and text etymology key\n`;
        if (use_wikidata && !filter_tags && !osm_text_key)
            query += `nwr${notTooBig}["wikidata"];\n`;

        filter_tags?.forEach(filter_tag => {
            const filter_split = filter_tag.split("="),
                filter_key = filter_split[0],
                filter_value = filter_split[1],
                filter_clause = filter_value ? `${filter_key}"="${filter_value}` : filter_key;

            if (!wd_keys.includes(filter_key) && osm_text_key !== filter_key) {
                extra_wd_keys.forEach(
                    key => query += `nwr${notTooBig}["${filter_clause}"]["${key}"]; // ${filter_clause} is a filter, ${key} is a secondary wikidata key\n`
                );
                if (osm_text_key && !text_etymology_key_is_filter)
                    query += `nwr${notTooBig}["${filter_clause}"]["${osm_text_key}"]; // ${filter_clause} is a filter, ${osm_text_key} is a text etymology key\n`;
                if (use_wikidata)
                    query += `nwr${notTooBig}["${filter_clause}"]["wikidata"]; // ${filter_clause} is a filter\n`;
            }
        });

        const maxElements = getConfig("max_map_elements");
        query += `);\n${outClause}`.replace("${maxElements}", maxElements || "");

        return query;
    }
}