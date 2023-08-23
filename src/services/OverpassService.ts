import { debugLog, getConfig, getJsonConfig } from "../config";
import { GeoJSON, BBox, Feature as GeoJSONFeature, Geometry, GeoJsonProperties } from "geojson";
import { EtymologyFeature, EtymologyResponse } from "../generated/owmf";
import { logErrorMessage } from "../monitoring";
import { Configuration, OverpassApi } from "../generated/overpass";
import { MapDatabase } from "../db/MapDatabase";
import osmtogeojson from "osmtogeojson";

type Feature = GeoJSONFeature<Geometry, GeoJsonProperties> & EtymologyFeature;

export class OverpassService {
    private api: OverpassApi;
    private db: MapDatabase;
    protected defaultLanguage: string;
    protected language?: string;

    constructor(db: MapDatabase) {
        const endpoints: string[] = getJsonConfig("overpass_endpoints") || ["https://overpass-api.de/api"],
            randomIndex = Math.floor(Math.random() * endpoints.length),
            basePath = endpoints[randomIndex];
        this.api = new OverpassApi(new Configuration({ basePath }));
        this.defaultLanguage = getConfig("default_language") || 'en';
        this.language = document.documentElement.lang.split('-').at(0);
        this.db = db;
    }

    canHandleSource(sourceID: string): boolean {
        if (!/^overpass_(wd|all_wd|all|osm_[_a-z]+)$/.test(sourceID))
            return false;

        return true;
    }

    fetchMapClusterElements(sourceID: string, bbox: BBox): Promise<GeoJSON & EtymologyResponse> {
        return this.fetchMapData(
            "out ids center ${maxElements};", "elements_" + sourceID, bbox
        );
    }

    async fetchMapElementDetails(sourceID: string, bbox: BBox): Promise<GeoJSON & EtymologyResponse> {
        const out = await this.fetchMapData("out body ${maxElements}; >; out skel qt;", "details_" + sourceID, bbox);
        out.features = out.features.filter(
            (feature: Feature) => sourceID === "overpass_wd" ? feature.properties?.wikidata : (feature.properties?.etymologies?.length || feature.properties?.text_etymology)
        );
        return out;
    }

    private async fetchMapData(outClause: string, sourceID: string, bbox: BBox): Promise<GeoJSON & EtymologyResponse> {
        let out = await this.db.getMap(sourceID, bbox, this.language);
        if (out) {
            debugLog("Overpass cache hit, using cached response", { sourceID, bbox, language: this.language, out });
        } else {
            debugLog("Overpass cache miss, fetching data", { sourceID, bbox, language: this.language });
            const filter_tags: string[] | null = getJsonConfig("osm_filter_tags"),
                wikidata_keys: string[] | null = getJsonConfig("osm_wikidata_keys"),
                maxElements = getConfig("max_map_elements"),
                osm_text_key = getConfig("osm_text_key"),
                osm_description_key = getConfig("osm_description_key"),
                requireKeys = !sourceID.endsWith("overpass_wd");
            let keys: string[], use_text_key: boolean, use_wikidata: boolean;

            if (sourceID.endsWith("overpass_wd")) {
                keys = [];
                use_text_key = false;
                use_wikidata = true;
            } else if (!wikidata_keys) {
                throw new Error("No keys configured")
            } else if (sourceID.endsWith("overpass_all_wd")) {
                keys = wikidata_keys;
                use_text_key = true;
                use_wikidata = true;
            } else if (sourceID.endsWith("overpass_all")) {
                keys = wikidata_keys;
                use_text_key = true;
                use_wikidata = false;
            } else {
                const wikidata_key_codes = wikidata_keys.map(key => key.replace(":wikidata", "").replace(":", "_")),
                    sourceKeyCode = /^\w+_overpass_osm_([_a-z]+)$/.exec(sourceID)?.at(1);
                if (!sourceKeyCode)
                    throw new Error("Failed to extract sourceKeyCode");
                else if (!wikidata_key_codes.includes(sourceKeyCode))
                    throw new Error(`Invalid sourceID: ${sourceID}`);
                else
                    keys = wikidata_keys.filter(key => key.replace(":wikidata", "").replace(":", "_") === sourceKeyCode);
                use_text_key = false;
                use_wikidata = false;
            }

            let query = `[out:json][timeout:40][bbox:${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]}]; (\n`;
            if (filter_tags) {
                filter_tags.forEach(filter_tag => {
                    const filter_split = filter_tag.split("="),
                        filter_on_value = filter_split.length > 1 && filter_split[1] !== "*",
                        filter_clause = filter_on_value ? `${filter_split[0]}"="${filter_split[1]}` : filter_split[0];
                    keys.forEach(key => { query += `nwr["${filter_clause}"]["${key}"~"^Q[0-9]+"];\n`; });
                    if (use_text_key && osm_text_key)
                        query += `nwr["${filter_clause}"]["${osm_text_key}"];\n`;
                    if (use_wikidata)
                        query += `nwr["${filter_clause}"]["wikidata"~"^Q[0-9]+"];\n`;
                });
            } else {
                keys.forEach(key => { query += `nwr["${key}"~"^Q[0-9]+"];\n`; });
                if (use_text_key && osm_text_key)
                    query += `nwr["${osm_text_key}"];\n`;
                if (use_wikidata)
                    query += `nwr["wikidata"~"^Q[0-9]+"];\n`;
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

                if (use_text_key) {
                    if (osm_text_key)
                        feature.properties.text_etymology = feature.properties[osm_text_key];
                    if (osm_description_key)
                        feature.properties.text_etymology_descr = feature.properties[osm_description_key];
                }

                if (typeof feature.properties.wikimedia_commons === "string") {
                    if (feature.properties.wikimedia_commons?.includes("File:"))
                        feature.properties.picture = feature.properties.wikimedia_commons;
                    else
                        feature.properties.commons = feature.properties.wikimedia_commons;
                }

                if (feature.properties["name:" + this.language])
                    feature.properties.name = feature.properties["name:" + this.language];
                else if (feature.properties["name:" + this.defaultLanguage])
                    feature.properties.name = feature.properties["name:" + this.defaultLanguage];

                feature.properties.etymologies = keys
                    .map(key => feature.properties?.[key])
                    .filter(value => value)
                    .flatMap((value: string) => value.split(";"))
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
            this.db.addMap(out);
        }
        return out;
    }
}