import { debugLog, getConfig, getJsonConfig } from "../config";
import { GeoJSON, BBox, Feature as GeoJSONFeature, Geometry, GeoJsonProperties } from "geojson";
import { EtymologyFeature, EtymologyResponse } from "../generated/owmf";
import { logErrorMessage } from "../monitoring";
import { compress, decompress } from "lz-string";
import { Configuration, OverpassApi } from "../generated/overpass";
import osmtogeojson from "osmtogeojson";

type Feature = GeoJSONFeature<Geometry, GeoJsonProperties> & EtymologyFeature;

export class OverpassService {
    private api: OverpassApi;
    protected defaultLanguage: string;
    protected language?: string;

    constructor() {
        const endpoints: string[] = getJsonConfig("overpass_endpoints") || ["https://overpass-api.de/api"],
            randomIndex = Math.floor(Math.random() * endpoints.length),
            basePath = endpoints[randomIndex];
        this.api = new OverpassApi(new Configuration({ basePath }));
        this.defaultLanguage = getConfig("default_language") || 'en';
        this.language = document.documentElement.lang.split('-').at(0);
    }

    canHandleSource(sourceID: string): boolean {
        if (!/^overpass_(all|osm_[_a-z]+)$/.test(sourceID))
            return false;

        return true;
    }

    fetchMapClusterElements(sourceID: string, bbox: BBox, includeWikidata = false): Promise<GeoJSON & EtymologyResponse> {
        return this.fetchMapData(
            "elements", "out ids center ${maxElements};", sourceID, bbox, includeWikidata
        );
    }

    fetchMapElementDetails(sourceID: string, bbox: BBox, includeWikidata = false): Promise<GeoJSON & EtymologyResponse> {
        return this.fetchMapData(
            "map", "out body ${maxElements}; >; out skel qt;", sourceID, bbox, includeWikidata
        );
    }

    async fetchMapData(cachePrefix: string, outClause: string, sourceID: string, bbox: BBox, includeWikidata = false): Promise<GeoJSON & EtymologyResponse> {
        const cacheKey = `owmf.${cachePrefix}.${sourceID}.${this.language}_${bbox.join("_")}`,
            cachedResponse = localStorage.getItem(cacheKey);
        let out: GeoJSON & EtymologyResponse;
        if (cachedResponse) {
            out = JSON.parse(decompress(cachedResponse));
            debugLog("Cache hit, using cached response", { cacheKey, out });
        } else {
            debugLog("Cache miss, fetching data", { cacheKey });
            const filter_tags: string[] | null = getJsonConfig("osm_filter_tags"),
                wikidata_keys: string[] | null = getJsonConfig("osm_wikidata_keys"),
                maxElements: string | null = getConfig("max_map_elements"),
                osm_text_key = getConfig("osm_text_key"),
                osm_description_key = getConfig("osm_description_key");
            let keys: string[], text_key: string | null;

            if (sourceID === "overpass_text") {
                keys = [];
                text_key = osm_text_key;
            } else if (!wikidata_keys) {
                throw new Error("No keys configured")
            } else if (sourceID === "overpass_all") {
                keys = wikidata_keys;
                text_key = osm_text_key;
            } else {
                const wikidata_key_codes = wikidata_keys.map(key => key.replace(":wikidata", "").replace(":", "_")),
                    sourceKeyCode = /^overpass_osm_([_a-z]+)$/.exec(sourceID)?.at(1);
                if (!sourceKeyCode)
                    throw new Error("Failed to extract sourceKeyCode");
                else if (!wikidata_key_codes.includes(sourceKeyCode))
                    throw new Error(`Invalid sourceID: ${sourceID}`);
                else
                    keys = wikidata_keys.filter(key => key.replace(":wikidata", "").replace(":", "_") === sourceKeyCode);
                text_key = null;
            }

            let query = `
[out:json][timeout:40];
(
`;
            if (filter_tags) {
                filter_tags.forEach(filter_tag => {
                    const filter_split = filter_tag.split("="),
                        filter_clause = (filter_split.length > 1 && filter_split[1] !== "*") ? `${filter_split[0]}"="${filter_split[1]}` : filter_split[0];
                    keys.forEach(key => { query += `nwr["${filter_clause}"]["${key}"~"^Q[0-9]+"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});\n`; });
                    if (text_key)
                        query += `nwr["${filter_clause}"]["${text_key}"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});\n`;
                    if (includeWikidata)
                        query += `nwr["${filter_clause}"]["wikidata"~"^Q[0-9]+"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});\n`;
                });
            } else {
                keys.forEach(key => { query += `nwr["${key}"~"^Q[0-9]+"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});\n`; });
                if (text_key)
                    query += `nwr["${text_key}"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});\n`;
                if (includeWikidata)
                    query += `nwr["wikidata"~"^Q[0-9]+"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});\n`;
            }
            query += `
); 
${outClause}`.replace("${maxElements}", maxElements || "");

            const res = await this.api.postOverpassQuery({ data: query });

            out = osmtogeojson(res);
            out.features.forEach((feature: Feature) => {
                if (!feature.id)
                    feature.id = feature.properties?.id ? feature.properties.id : Math.random().toString();
                if (!feature.properties)
                    feature.properties = {};
                feature.properties.from_osm = true;
                feature.properties.from_wikidata = false;
                const osm_type = feature.properties.id?.split("/")?.[0],
                    osm_id = feature.properties.id ? feature.properties.id.split("/")[1] : undefined;
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
                feature.properties.etymologies = [];
                keys.map(key => feature.properties?.[key])
                    .filter(value => value)
                    .flatMap((value: string) => value.split(";"))
                    .forEach(value => feature.properties?.etymologies?.push({
                        from_osm: true,
                        from_osm_id: osm_id,
                        from_osm_type: osm_type,
                        from_wikidata: false,
                        propagated: false,
                        wikidata: value
                    }));
            });
            out.metadata = { overpass_query: query, timestamp: new Date().toISOString() };
            try {
                localStorage.setItem(cacheKey, compress(JSON.stringify(out)));
            } catch (e) {
                logErrorMessage("Failed to store map data in cache", "warning", { cacheKey, out, e });
            }
        }
        return out;
    }
}