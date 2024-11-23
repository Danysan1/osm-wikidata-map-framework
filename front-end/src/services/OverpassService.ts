import type { BBox } from "geojson";
import osmtogeojson from "osmtogeojson";
import type { MapDatabase } from "../db/MapDatabase";
import type { Etymology, OsmType } from "../model/Etymology";
import { osmKeyToKeyID, type EtymologyFeature, type EtymologyResponse } from "../model/EtymologyResponse";
import { SourcePreset } from "../model/SourcePreset";
import type { MapService } from "./MapService";

const COMMONS_CATEGORY_REGEX = /(Category:[^;]+)/,
    COMMONS_FILE_REGEX = /(File:[^;]+)/,
    WIKIDATA_QID_REGEX = /^Q[0-9]+/;

export class OverpassService implements MapService {
    private readonly preset: SourcePreset;
    private readonly maxElements?: number;
    private readonly maxRelationMembers?: number;
    private readonly wikidata_key_codes?: Record<string, string>;
    private readonly db?: MapDatabase;
    private readonly baseBBox?: BBox;
    private readonly overpassEndpoint: string;

    public constructor(
        preset: SourcePreset,
        maxElements?: number,
        maxRelationMembers?: number,
        db?: MapDatabase,
        bbox?: BBox,
        overpassEndpoints?: string[]
    ) {
        const endpoints = overpassEndpoints?.length ? overpassEndpoints : ["https://overpass-api.de/api"],
            randomIndex = Math.floor(Math.random() * endpoints.length);
        this.overpassEndpoint = endpoints[randomIndex] + "interpreter";
        this.preset = preset;
        this.maxElements = maxElements;
        this.maxRelationMembers = maxRelationMembers;
        this.db = db;
        this.baseBBox = bbox;
        this.wikidata_key_codes = this.preset.osm_wikidata_keys?.reduce((acc: Record<string, string>, key) => {
            acc[osmKeyToKeyID(key)] = key;
            return acc;
        }, {});
        if (process.env.NODE_ENV === 'development') console.debug("OverpassService initialized", { preset: this.preset, wikidata_key_codes: this.wikidata_key_codes });
    }

    public canHandleBackEnd(backEndID: string): boolean {
        return /^overpass_(wd|all_wd|all|osm_[_a-z]+)$/.test(backEndID);
    }

    public async fetchMapElements(backEndID: string, onlyCentroids: boolean, bbox: BBox, language: string): Promise<EtymologyResponse> {
        const trueBBox: BBox = bbox.map(coord => coord % 180) as BBox;
        if (this.baseBBox && (trueBBox[2] < this.baseBBox[0] || trueBBox[3] < this.baseBBox[1] || trueBBox[0] > this.baseBBox[2] || trueBBox[1] > this.baseBBox[3])) {
            if (process.env.NODE_ENV === 'development') console.warn("Overpass fetchMapElements: request bbox does not overlap with the instance bbox", { bbox, trueBBox, baseBBox: this.baseBBox });
            return { type: "FeatureCollection", features: [] };
        }

        const cachedResponse = await this.db?.getMap(this.preset?.id, backEndID, onlyCentroids, trueBBox, language);
        if (cachedResponse)
            return cachedResponse;

        const out = await this.fetchMapData(backEndID, onlyCentroids, trueBBox, language);
        if (!onlyCentroids) {
            out.features = out.features.filter(
                (feature: EtymologyFeature) => !!feature.properties?.linked_entity_count // Any linked entity is available
                    || (feature.properties?.wikidata && backEndID.endsWith("_wd")) // "wikidata=*"-only OSM source and wikidata=* is available
            );
            out.total_entity_count = out.features.reduce((acc, feature) => acc + (feature.properties?.linked_entity_count ?? 0), 0);
        }

        if (process.env.NODE_ENV === 'development') console.debug(`Overpass fetchMapElements found ${out.features.length} features with ${out.total_entity_count} linked entities after filtering`, out);
        void this.db?.addMap(out);
        return out;
    }

    private async fetchMapData(backEndID: string, onlyCentroids: boolean, bbox: BBox, language: string): Promise<EtymologyResponse> {
        const area = Math.abs((bbox[2] - bbox[0]) * (bbox[3] - bbox[1]));
        if (area < 0.00000001 || area > 1.5)
            throw new Error(`Invalid bbox area: ${area} (bbox: ${bbox.join("/")})`);

        let osm_keys: string[],
            use_wikidata: boolean,
            search_text_key: string | undefined = this.preset?.osm_text_key;

        if (backEndID.includes("overpass_wd")) {
            // Search only elements with wikidata=*
            osm_keys = [];
            search_text_key = undefined;
            use_wikidata = true;
        } else if (!this.preset?.osm_wikidata_keys) {
            throw new Error(`No Wikidata keys configured, invalid Overpass back-end ID: "${backEndID}"`)
        } else if (backEndID.includes("overpass_all_wd")) {
            // Search all elements with an etymology (all wikidata_keys) and/or with wikidata=*
            osm_keys = this.preset.osm_wikidata_keys;
            use_wikidata = true;
        } else if (backEndID.includes("overpass_all")) {
            // Search all elements with an etymology
            osm_keys = this.preset.osm_wikidata_keys;
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
            { overpassJson } = await import("overpass-ts"),
            res = await overpassJson(query, { endpoint: this.overpassEndpoint });
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
        out.sourcePresetID = this.preset.id;
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

        const full_osm_props_id = typeof feature.properties.id === "string" && feature.properties.id.includes("/") ? feature.properties.id : undefined,
            full_osm_base_id = typeof feature.id === "string" && feature.id.includes("/") ? feature.id : undefined,
            full_osm_id = full_osm_base_id ?? full_osm_props_id,
            osm_type = full_osm_id?.split("/")?.[0],
            osm_id = full_osm_id ? parseInt(full_osm_id?.split("/")[1]) : undefined;
        feature.id = "osm.org/" + full_osm_id;
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

        if (feature.properties.tags.wikidata && WIKIDATA_QID_REGEX.test(feature.properties.tags.wikidata))
            feature.properties.wikidata = feature.properties.tags.wikidata

        if (feature.properties.tags.wikipedia)
            feature.properties.wikipedia = feature.properties.tags.wikipedia;

        if (this.preset?.osm_text_key) {
            if (feature.properties.tags[this.preset.osm_text_key])
                feature.properties.text_etymology = feature.properties.tags[this.preset.osm_text_key];
            else if (feature.properties.relations?.length && this.preset?.relation_role_whitelist?.length) {
                const text_etymologies = feature.properties.relations
                    .filter(rel => rel.reltags?.[this.preset.osm_text_key!] && rel.role && this.preset.relation_role_whitelist?.includes(rel.role))
                    .map(rel => rel.reltags[this.preset.osm_text_key!]);
                if (text_etymologies.length > 1)
                    console.warn("Multiple text etymologies found for feature, using the first one", feature.properties);
                if (text_etymologies.length)
                    feature.properties.text_etymology = text_etymologies[0];
            }
        }

        if (feature.properties.tags.website)
            feature.properties.website_url = feature.properties.tags.website;

        if (this.preset?.osm_description_key && feature.properties.tags[this.preset.osm_description_key])
            feature.properties.text_etymology_descr = feature.properties.tags[this.preset.osm_description_key];

        if (feature.properties.tags.wikimedia_commons)
            feature.properties.commons = COMMONS_CATEGORY_REGEX.exec(feature.properties.tags.wikimedia_commons)?.at(1);

        if (feature.properties.tags.wikimedia_commons)
            feature.properties.picture = COMMONS_FILE_REGEX.exec(feature.properties.tags.wikimedia_commons)?.at(1);
        else if (feature.properties.tags.image)
            feature.properties.picture = COMMONS_FILE_REGEX.exec(feature.properties.tags.image)?.at(1);

        const localNameKey = "name:" + language,
            localName = feature.properties.tags[localNameKey];
        if (typeof localName === "string")
            feature.properties.name = localName;
        else if (feature.properties.tags.name)
            feature.properties.name = feature.properties.tags.name;
        // Default language is intentionally not used as it could overwrite a more specific language in name=*

        const linkedEntities: Etymology[] = [];
        osm_keys.forEach(key => {
            linkedEntities.push(
                ...feature.properties?.tags?.[key]
                    ?.split(";")
                    ?.filter(value => WIKIDATA_QID_REGEX.test(value))
                    ?.map<Etymology>(value => ({
                        from_osm: true,
                        from_osm_id: osm_id,
                        from_osm_type: feature.properties?.osm_type,
                        from_wikidata: false,
                        propagated: false,
                        wikidata: value
                    })) ?? []);

            if (this.preset?.relation_role_whitelist?.length) {
                feature.properties?.relations
                    ?.filter(rel => rel.role && this.preset.relation_role_whitelist!.includes(rel.role) && rel.reltags[key] && WIKIDATA_QID_REGEX.test(rel.reltags[key]))
                    ?.forEach(rel => {
                        if (process.env.NODE_ENV === 'development') console.debug(`Overpass fetchMapData porting etymology from relation`, rel);
                        linkedEntities.push(
                            ...rel.reltags[key]
                                .split(";")
                                .filter(value => WIKIDATA_QID_REGEX.test(value))
                                .map<Etymology>(value => ({
                                    from_osm: true,
                                    from_osm_id: rel.rel,
                                    from_osm_type: "relation",
                                    from_wikidata: false,
                                    propagated: false,
                                    wikidata: value
                                }))
                        );
                        feature.properties!.name ??= rel.reltags[localNameKey] ?? rel.reltags.name;
                        feature.properties!.description ??= rel.reltags.description;
                        feature.properties!.wikidata ??= rel.reltags.wikidata;
                    });
            }
        });
        feature.properties.linked_entities = linkedEntities;
        feature.properties.linked_entity_count = linkedEntities.length + (feature.properties.text_etymology ? 1 : 0);
    }

    private buildOverpassQuery(
        wd_keys: string[], bbox: BBox, osm_text_key: string | undefined, use_wikidata: boolean, onlyCentroids: boolean
    ): string {
        // See https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/CONTRIBUTING.md#user-content-excluded-elements
        const maxMembersFilter = this.maxRelationMembers ? `(if:count_members()<${this.maxRelationMembers})` : "",
            notTooBig = `[!"end_date"][!"sqkm"][!"boundary"]["type"!="boundary"]["route"!="historic"]${maxMembersFilter}`,
            filter_tags = this.preset?.osm_filter_tags?.map(tag => tag.replace("=*", "")),
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