import type { BBox } from "geojson";
import osmtogeojson from "osmtogeojson";
import type { MapService } from "./MapService";
import type { Etymology } from "../model/Etymology";
import { osmKeyToKeyID, type EtymologyFeature, type EtymologyResponse } from "../model/EtymologyResponse";
import type { OsmType } from "../model/Etymology";
import type { MapDatabase } from "../db/MapDatabase";
import { overpass, type OverpassJson } from "overpass-ts";

const commonsCategoryRegex = /(Category:[^;]+)/;
const commonsFileRegex = /(File:[^;]+)/;

export class OverpassService implements MapService {
    private readonly osmTextKey?: string;
    private readonly osmDescriptionKey?: string;
    private readonly maxElements?: number;
    private readonly maxRelationMembers?: number;
    private readonly osmWikidataKeys?: string[];
    private readonly osmFilterTags?: string[];
    private readonly wikidata_key_codes?: Record<string, string>;
    private readonly db?: MapDatabase;
    private readonly baseBBox?: BBox;
    private readonly overpassEndpoint: string;

    public constructor(
        osmTextKey?: string,
        osmDescriptionKey?: string,
        maxElements?: number,
        maxRelationMembers?: number,
        osmWikidataKeys?: string[],
        osmFilterTags?: string[],
        db?: MapDatabase,
        bbox?: BBox,
        overpassEndpoints?: string[]
    ) {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        const endpoints = overpassEndpoints || ["https://overpass-api.de/api"],
            randomIndex = Math.floor(Math.random() * endpoints.length);
        this.overpassEndpoint = endpoints[randomIndex] + "interpreter";
        this.osmTextKey = osmTextKey;
        this.osmDescriptionKey = osmDescriptionKey;
        this.maxElements = maxElements;
        this.maxRelationMembers = maxRelationMembers;
        this.db = db;
        this.baseBBox = bbox;
        this.osmWikidataKeys = osmWikidataKeys;
        this.osmFilterTags = osmFilterTags;
        this.wikidata_key_codes = this.osmWikidataKeys?.reduce((acc: Record<string, string>, key) => {
            acc[osmKeyToKeyID(key)] = key;
            return acc;
        }, {});
        if (process.env.NODE_ENV === 'development') console.debug("OverpassService initialized", { wikidata_keys: this.osmWikidataKeys, wikidata_key_codes: this.wikidata_key_codes });
    }

    public canHandleBackEnd(backEndID: string): boolean {
        if (!/^overpass_(wd|all_[_a-z]+|osm_[_a-z]+)$/.test(backEndID))
            return false;

        return true;
    }

    public async fetchMapElements(backEndID: string, onlyCentroids: boolean, bbox: BBox, language: string): Promise<EtymologyResponse> {
        if (this.baseBBox && (bbox[2] < this.baseBBox[0] || bbox[3] < this.baseBBox[1] || bbox[0] > this.baseBBox[2] || bbox[1] > this.baseBBox[3])) {
            if (process.env.NODE_ENV === 'development') console.warn("Overpass fetchMapElements: request bbox does not overlap with the instance bbox", { bbox, baseBBox: this.baseBBox });
            return { type: "FeatureCollection", features: [] };
        }

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
        let osm_keys: string[],
            use_wikidata: boolean,
            search_text_key: string | undefined = this.osmTextKey;

        if (backEndID.includes("overpass_wd")) {
            // Search only elements with wikidata=*
            osm_keys = [];
            search_text_key = undefined;
            use_wikidata = true;
        } else if (!this.osmWikidataKeys) {
            throw new Error(`No Wikidata keys configured, invalid Overpass back-end ID: "${this.osmWikidataKeys}"`)
        } else if (backEndID.includes("overpass_all_wd")) {
            // Search all elements with an etymology (all wikidata_keys) and/or with wikidata=*
            osm_keys = this.osmWikidataKeys;
            use_wikidata = true;
        } else if (backEndID.includes("overpass_all")) {
            // Search all elements with an etymology
            osm_keys = this.osmWikidataKeys;
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

            search_text_key = undefined;
            use_wikidata = false;
        }

        if (process.env.NODE_ENV === 'development') console.time("overpass_query");
        const query = this.buildOverpassQuery(osm_keys, bbox, search_text_key, use_wikidata, onlyCentroids),
            response = await overpass(query, { endpoint: this.overpassEndpoint }),
            res = await response.json() as OverpassJson;
        if (process.env.NODE_ENV === 'development') console.timeEnd("overpass_query");
        if (!res.elements)
            throw new Error("Bad response from Overpass");

        if (process.env.NODE_ENV === 'development') console.debug(`Overpass fetchMapData found ${res.elements?.length} ELEMENTS`, res.elements);

        if (!res.elements && res.remark)
            throw new Error(`Overpass API error: ${res.remark}`);

        if (process.env.NODE_ENV === 'development') console.time("overpass_transform");
        const out: EtymologyResponse = osmtogeojson(res, { flatProperties: false, verbose: true });
        if (process.env.NODE_ENV === 'development') console.debug(`Overpass fetchMapData found ${out.features.length} FEATURES:`, out.features);

        out.features.forEach(f => this.transformFeature(f, osm_keys, language));
        out.overpass_query = query;
        out.timestamp = new Date().toISOString();
        out.bbox = bbox;
        out.backEndID = backEndID;
        out.onlyCentroids = onlyCentroids;
        out.language = language;
        out.truncated = res.elements?.length === this.maxElements;
        if (process.env.NODE_ENV === 'development') console.timeEnd("overpass_transform");

        return out;
    }

    private transformFeature(feature: EtymologyFeature, osm_keys: string[], language: string) {
        if (!feature.properties)
            feature.properties = {};

        feature.properties.from_osm = true;
        feature.properties.from_wikidata = false;

        const full_osm_id = typeof feature.properties.id === "string" && feature.properties.id.includes("/") ? feature.properties.id : undefined,
            osm_type = full_osm_id?.split("/")?.[0],
            osm_id = full_osm_id ? parseInt(full_osm_id?.split("/")[1]) : undefined;
        feature.properties.osm_id = osm_id;
        feature.properties.osm_type = osm_type ? osm_type as OsmType : undefined;

        if (!feature.properties.tags)
            return;

        if (feature.properties.tags.height)
            feature.properties.render_height = parseInt(feature.properties.tags.height);
        else if (feature.properties.tags["building:levels"])
            feature.properties.render_height = parseInt(feature.properties.tags["building:levels"]) * 4;
        else if (feature.properties.tags.building)
            feature.properties.render_height = 6;

        if (feature.properties.tags.alt_name)
            feature.properties.alt_name = feature.properties.tags.alt_name;

        if (feature.properties.tags.official_name)
            feature.properties.official_name = feature.properties.tags.official_name;

        if (feature.properties.tags.description)
            feature.properties.description = feature.properties.tags.description;

        if (feature.properties.tags.wikipedia)
            feature.properties.wikipedia = feature.properties.tags.wikipedia;

        if (this.osmTextKey && feature.properties.tags[this.osmTextKey])
            feature.properties.text_etymology = feature.properties.tags[this.osmTextKey];
        else if (feature.properties.relations?.length) {
            const text_etymologies = feature.properties.relations.map(rel => rel.reltags?.[this.osmTextKey!]).filter(x => x);
            if (text_etymologies.length > 1)
                console.warn("Multiple text etymologies found for feature", feature.properties);
            if (text_etymologies.length)
                feature.properties.text_etymology = text_etymologies[0];
        }

        if (feature.properties.tags.website)
            feature.properties.website_url = feature.properties.tags.website;

        if (this.osmDescriptionKey && feature.properties.tags[this.osmDescriptionKey])
            feature.properties.text_etymology_descr = feature.properties.tags[this.osmDescriptionKey];

        if (feature.properties.tags.wikimedia_commons)
            feature.properties.commons = commonsCategoryRegex.exec(feature.properties.tags.wikimedia_commons)?.at(1);

        if (feature.properties.tags.wikimedia_commons)
            feature.properties.picture = commonsFileRegex.exec(feature.properties.tags.wikimedia_commons)?.at(1);
        else if (feature.properties.tags.image)
            feature.properties.picture = commonsFileRegex.exec(feature.properties.tags.image)?.at(1);

        const localNameKey = "name:" + language,
            localName = feature.properties.tags[localNameKey];
        if (typeof localName === "string")
            feature.properties.name = localName;
        else if (feature.properties.tags.name)
            feature.properties.name = feature.properties.tags.name;
        // Default language is intentionally not used as it could overwrite a more specific language in name=*

        feature.properties.etymologies = osm_keys
            .map(key => feature.properties?.tags?.[key])
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
        if (!feature.properties.etymologies.length) {
            feature.properties.etymologies = osm_keys
                .flatMap(key => feature.properties?.relations?.map(rel => rel.reltags[key]))
                .flatMap(value => typeof value === "string" ? value.split(";") : undefined)
                .filter(value => value && /^Q[0-9]+/.test(value))
                .map<Etymology>(value => ({
                    from_osm: true,
                    from_osm_id: osm_id, // TODO track the source relation
                    from_osm_type: feature.properties?.osm_type,
                    from_wikidata: false,
                    propagated: false,
                    wikidata: value
                }));
        }
    }

    private buildOverpassQuery(
        wd_keys: string[], bbox: BBox, osm_text_key: string | undefined, use_wikidata: boolean, onlyCentroids: boolean
    ): string {
        // See https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/CONTRIBUTING.md#user-content-excluded-elements
        const maxMembersFilter = this.maxRelationMembers ? `(if:count_members()<${this.maxRelationMembers})` : "",
            notTooBig = `[!"end_date"][!"sqkm"][!"boundary"]["type"!="boundary"]["route"!="historic"]${maxMembersFilter}`,
            filter_tags = this.osmFilterTags?.map(tag => tag.replace("=*", "")),
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
// Max relation members: ${this.maxRelationMembers ?? "UNLIMITED"}
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

        const outClause = onlyCentroids ? `out ids center ${this.maxElements};` : `out body ${this.maxElements}; >; out skel qt;`;
        query += `);
// Max elements: ${this.maxElements ?? "NONE"}
${outClause}
`;

        return query;
    }
}