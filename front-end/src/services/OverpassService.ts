import type { BBox } from "geojson";
import osmtogeojson from "osmtogeojson";
import type { MapDatabase } from "../db/MapDatabase";
import type { Etymology, OsmType } from "../model/Etymology";
import { OsmInstance, getFeatureTags, ohmKeyToKeyID, osmKeyToKeyID, type OwmfFeature, type OwmfResponse } from "../model/OwmfResponse";
import { SourcePreset } from "../model/SourcePreset";
import type { MapService } from "./MapService";

const COMMONS_CATEGORY_REGEX = /(Category:[^;]+)/,
    COMMONS_FILE_REGEX = /(File:[^;]+)/,
    WIKIDATA_QID_REGEX = /^Q[0-9]+/;

/**
 * Service that handles the creation of Overpass QL queries and the execution of them on the appropriate instance of Overpass
 * 
 * @see https://wiki.openstreetmap.org/wiki/Overpass_API
 * @see https://wiki.openstreetmap.org/wiki/OpenHistoricalMap/Overpass
 */
export class OverpassService implements MapService {
    private readonly preset: SourcePreset;
    private readonly maxElements?: number;
    private readonly maxRelationMembers?: number;
    private readonly wikidata_key_codes?: Record<string, string>;
    private readonly db?: MapDatabase;
    private readonly baseBBox?: BBox;

    public constructor(
        preset: SourcePreset,
        maxElements?: number,
        maxRelationMembers?: number,
        db?: MapDatabase,
        bbox?: BBox
    ) {
        this.preset = preset;
        this.maxElements = maxElements;
        this.maxRelationMembers = maxRelationMembers;
        this.db = db;
        this.baseBBox = bbox;
        this.wikidata_key_codes = this.preset.osm_wikidata_keys?.reduce((acc: Record<string, string>, key) => {
            acc[osmKeyToKeyID(key)] = key;
            acc[ohmKeyToKeyID(key)] = key;
            return acc;
        }, {});
        if (process.env.NODE_ENV === 'development') console.debug("OverpassService initialized", { preset: this.preset, wikidata_key_codes: this.wikidata_key_codes });
    }

    public canHandleBackEnd(backEndID: string): boolean {
        return /^overpass_(osm|ohm)_(wd|all_wd|all|osm_[_a-z]+)$/.test(backEndID);
    }

    public async fetchMapElements(backEndID: string, onlyCentroids: boolean, bbox: BBox, language: string): Promise<OwmfResponse> {
        language = ''; // Not used in Overpass query

        const trueBBox: BBox = bbox.map(coord => coord % 180) as BBox;
        if (this.baseBBox && (trueBBox[2] < this.baseBBox[0] || trueBBox[3] < this.baseBBox[1] || trueBBox[0] > this.baseBBox[2] || trueBBox[1] > this.baseBBox[3])) {
            if (process.env.NODE_ENV === 'development') console.warn("Overpass fetchMapElements: request bbox does not overlap with the instance bbox", { bbox, trueBBox, baseBBox: this.baseBBox, language });
            return { type: "FeatureCollection", features: [] };
        }

        const cachedResponse = await this.db?.getMap(this.preset?.id, backEndID, onlyCentroids, trueBBox, language);
        if (cachedResponse)
            return cachedResponse;

        console.debug("No cached response found, fetching from Overpass", { bbox, trueBBox, sourcePresetID: this.preset?.id, backEndID, onlyCentroids, language });
        const out = await this.fetchMapData(backEndID, onlyCentroids, trueBBox);
        if (!onlyCentroids) {
            out.features = out.features.filter(
                (feature: OwmfFeature) => !!feature.properties?.linked_entity_count // Any linked entity is available
                    || (feature.properties?.wikidata && backEndID.endsWith("_wd")) // "wikidata=*"-only OSM source and wikidata=* is available
            );
            out.total_entity_count = out.features.reduce((acc, feature) => acc + (feature.properties?.linked_entity_count ?? 0), 0);
            out.language = language;
        }

        if (process.env.NODE_ENV === 'development') console.debug(`Overpass fetchMapElements found ${out.features.length} features with ${out.total_entity_count} linked entities after filtering`, out);
        void this.db?.addMap(out);
        return out;
    }

    private async fetchMapData(backEndID: string, onlyCentroids: boolean, bbox: BBox): Promise<OwmfResponse> {
        const area = Math.abs((bbox[2] - bbox[0]) * (bbox[3] - bbox[1]));
        if (area < 0.00000001 || area > 1.5)
            throw new Error(`Invalid bbox area: ${area} (bbox: ${bbox.join("/")})`);

        let site: OsmInstance,
            osm_keys: string[],
            use_wikidata: boolean,
            search_text_key: string | undefined = this.preset?.osm_text_key;

        if (backEndID.includes("overpass_osm_wd")) {
            // Search only elements with wikidata=*
            site = "openstreetmap.org";
            osm_keys = [];
            search_text_key = undefined;
            use_wikidata = true;
        } else if (backEndID.includes("overpass_ohm_wd")) {
            site = "openhistoricalmap.org"
            osm_keys = [];
            search_text_key = undefined;
            use_wikidata = true;
        } else if (!this.preset?.osm_wikidata_keys) {
            throw new Error(`No Wikidata keys configured, invalid Overpass back-end ID: "${backEndID}"`)
        } else {
            const backEndSplitted = /^.*overpass_((?:osm|ohm)_[_a-z]+)$/.exec(backEndID),
                keyCode = backEndSplitted?.at(1);

            if (process.env.NODE_ENV === 'development') console.debug("Overpass fetchMapData", { backEndID, sourceKeyCode: keyCode, wikidata_key_codes: this.wikidata_key_codes });
            if (!keyCode)
                throw new Error(`Failed to extract keyCode from back-end ID: "${backEndID}"`);

            site = keyCode.startsWith("ohm_") ? "openhistoricalmap.org" : "openstreetmap.org";
            if (keyCode.endsWith("_all_wd")) {
                // Search all elements with a linked entity key (all wikidata_keys, *:wikidata=*) and/or with wikidata=*
                osm_keys = this.preset.osm_wikidata_keys;
                use_wikidata = true;
            } else if (keyCode.endsWith("_all")) {
                // Search all elements with a linked entity key (all wikidata_keys, *:wikidata=*)
                osm_keys = this.preset.osm_wikidata_keys;
                use_wikidata = false;
            } else if (this.wikidata_key_codes && (keyCode in this.wikidata_key_codes)) {
                // Search a specific linked entity key (*:wikidata=*)
                osm_keys = [this.wikidata_key_codes[keyCode]];
                search_text_key = undefined;
                use_wikidata = false;
            } else {
                throw new Error(`Invalid Overpass back-end ID: "${backEndID}"`);
            }
        }

        if (process.env.NODE_ENV === 'development') console.time("overpass_query");
        const query = this.buildOverpassQuery(osm_keys, bbox, search_text_key, use_wikidata, onlyCentroids),
            { overpassJson } = await import("overpass-ts"),
            endpoint = site === "openhistoricalmap.org" ? "https://overpass-api.openhistoricalmap.org/api/interpreter" : "https://overpass-api.de/api/interpreter",
            res = await overpassJson(query, { endpoint });
        if (process.env.NODE_ENV === 'development') console.timeEnd("overpass_query");
        if (!res.elements)
            throw new Error("Bad response from Overpass");

        if (process.env.NODE_ENV === 'development') console.debug(`Overpass fetchMapData found ${res.elements?.length} ELEMENTS`, res.elements);

        if (!res.elements && res.remark)
            throw new Error(`Overpass API error: ${res.remark}`);

        if (process.env.NODE_ENV === 'development') console.time("overpass_transform");
        const out: OwmfResponse = osmtogeojson(res, { flatProperties: false, verbose: true });
        if (process.env.NODE_ENV === 'development') console.debug(`Overpass fetchMapData found ${out.features.length} FEATURES:`, out.features);

        out.features.forEach(f => this.transformFeature(f, osm_keys));
        out.site = site;
        out.overpass_query = query;
        out.timestamp = new Date().toISOString();
        out.bbox = bbox;
        out.sourcePresetID = this.preset.id;
        out.backEndID = backEndID;
        out.onlyCentroids = onlyCentroids;
        out.truncated = res.elements?.length === this.maxElements;
        if (process.env.NODE_ENV === 'development') console.timeEnd("overpass_transform");

        return out;
    }

    private transformFeature(feature: OwmfFeature, osm_keys: string[]) {
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
        const tags = getFeatureTags(feature);

        if (tags.height)
            feature.properties.render_height = parseInt(tags.height);
        else if (tags["building:levels"])
            feature.properties.render_height = parseInt(tags["building:levels"]) * 4;
        else if (tags.building)
            feature.properties.render_height = 6;

        if (tags.wikidata && WIKIDATA_QID_REGEX.test(tags.wikidata))
            feature.properties.wikidata = tags.wikidata

        if (tags.wikipedia)
            feature.properties.wikipedia = tags.wikipedia;

        if (this.preset?.osm_text_key) {
            if (tags[this.preset.osm_text_key])
                feature.properties.text_etymology = tags[this.preset.osm_text_key];
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

        if (this.preset?.osm_description_key && tags[this.preset.osm_description_key])
            feature.properties.text_etymology_descr = tags[this.preset.osm_description_key];

        if (tags.wikimedia_commons)
            feature.properties.commons = COMMONS_CATEGORY_REGEX.exec(tags.wikimedia_commons)?.at(1);

        if (tags.wikimedia_commons)
            feature.properties.picture = COMMONS_FILE_REGEX.exec(tags.wikimedia_commons)?.at(1);
        else if (tags.image)
            feature.properties.picture = COMMONS_FILE_REGEX.exec(tags.image)?.at(1);

        const linkedEntities: Etymology[] = [];
        osm_keys.forEach(key => {
            linkedEntities.push(
                ...tags[key]
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
                        Object.keys(rel.reltags)
                            .filter(key => key.startsWith("name"))
                            .forEach(key => tags[key] ??= rel.reltags[key]);
                        tags.description ??= rel.reltags.description;
                        if (rel.reltags.wikidata && WIKIDATA_QID_REGEX.test(rel.reltags.wikidata))
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