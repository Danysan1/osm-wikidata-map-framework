import type { BBox } from "geojson";
import osmtogeojson from "osmtogeojson";
import type { OverpassJson } from "overpass-ts";
import type { MapDatabase } from "../../db/MapDatabase";
import { DatePrecision, LinkedEntity, OsmInstance, OsmType } from "../../model/LinkedEntity";
import { createFeatureTags, osmKeyToKeyID, type OwmfFeature, type OwmfResponse } from "../../model/OwmfResponse";
import type { SourcePreset } from "../../model/SourcePreset";
import type { MapService } from "../MapService";
import { COMMONS_CATEGORY_REGEX, COMMONS_FILE_REGEX } from "../WikimediaCommonsService";

const WIKIDATA_QID_REGEX = /^Q[0-9]+/;

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
            return acc;
        }, {});
        console.debug("OverpassService initialized", { preset: this.preset, wikidata_key_codes: this.wikidata_key_codes });
    }

    public canHandleBackEnd(backEndID: string): boolean {
        if (process.env.NEXT_PUBLIC_OWMF_enable_open_historical_map !== "true" && backEndID.includes("ohm"))
            return false;
        else if (this.preset?.osm_wikidata_keys)
            return /^overpass_(osm|ohm)_(wd|all_wd|all|rel_role|[_a-z]+)$/.test(backEndID);
        else
            return /^overpass_(osm|ohm)_wd$/.test(backEndID);
    }

    public async fetchMapElements(backEndID: string, onlyCentroids: boolean, bbox: BBox, language: string, year: number): Promise<OwmfResponse> {
        language = ''; // Not used in Overpass query

        const trueBBox: BBox = bbox.map(coord => coord % 180) as BBox;
        if (this.baseBBox && (trueBBox[2] < this.baseBBox[0] || trueBBox[3] < this.baseBBox[1] || trueBBox[0] > this.baseBBox[2] || trueBBox[1] > this.baseBBox[3])) {
            console.warn("Overpass fetchMapElements: request bbox does not overlap with the instance bbox", { bbox, trueBBox, baseBBox: this.baseBBox, language });
            return { type: "FeatureCollection", features: [] };
        }

        const cachedResponse = await this.db?.getMap(this.preset?.id, backEndID, onlyCentroids, trueBBox, language, year);
        if (cachedResponse)
            return cachedResponse;

        console.debug("No cached response found, fetching from Overpass", { bbox, trueBBox, sourcePresetID: this.preset?.id, backEndID, onlyCentroids, language });
        const out = await this.fetchMapData(backEndID, onlyCentroids, trueBBox, year);
        if (onlyCentroids) {
            console.debug(`Overpass found ${out.features.length} centroids`);
        } else {
            console.debug(`Overpass found ${out.features.length} features before filtering`);
            out.features = out.features.filter(
                (feature: OwmfFeature) => !!feature.properties?.linked_entity_count || ( // Any linked entity is available or ...
                    backEndID.endsWith("_wd") && // ... this back-end allows features that just have wikidata=* and ...
                    (!!feature.properties?.wikidata || feature.properties?.relations?.some(rel => rel.reltags?.wikidata)) // ... wikidata=* is available on the feature or on a containing relation     
                ));
            out.total_entity_count = out.features.reduce((acc, feature) => acc + (feature.properties?.linked_entity_count ?? 0), 0);
            console.debug(`Overpass found ${out.features.length} features with ${out.total_entity_count} linked entities after filtering`);
        }
        out.language = language;

        void this.db?.addMap(out);
        return out;
    }

    private async fetchMapData(backEndID: string, onlyCentroids: boolean, bbox: BBox, year: number): Promise<OwmfResponse> {
        const area = Math.abs((bbox[2] - bbox[0]) * (bbox[3] - bbox[1]));
        if (area < 0.000001 || (!onlyCentroids && area > 5)) {
            throw new Error(`Invalid bbox area: ${area} - ${bbox.join(",")}`);
        }

        let osmInstance: OsmInstance,
            osm_wikidata_keys: string[] = [],
            use_wikidata = false,
            relation_member_role: string | undefined,
            search_text_key: string | undefined;

        if (backEndID.includes("overpass_osm_wd")) {
            // Search only elements with wikidata=*
            osmInstance = OsmInstance.OpenStreetMap;
            osm_wikidata_keys = [];
            search_text_key = undefined;
            use_wikidata = true;
        } else if (process.env.NEXT_PUBLIC_OWMF_enable_open_historical_map === "true" && backEndID.includes("overpass_ohm_wd")) {
            osmInstance = OsmInstance.OpenHistoricalMap
            osm_wikidata_keys = [];
            search_text_key = undefined;
            use_wikidata = true;
        } else if (!this.preset?.osm_wikidata_keys) {
            throw new Error(`No Wikidata keys configured, invalid Overpass back-end ID: "${backEndID}"`)
        } else {
            const backEndSplitted = /^.*overpass_((?:osm|ohm)_[_a-z]+)$/.exec(backEndID),
                keyCode = backEndSplitted?.at(1);

            console.debug("Overpass fetchMapData", { backEndID, sourceKeyCode: keyCode, wikidata_key_codes: this.wikidata_key_codes });
            if (!keyCode)
                throw new Error(`Failed to extract keyCode from back-end ID: "${backEndID}"`);

            osmInstance = keyCode.startsWith("ohm_") ? OsmInstance.OpenHistoricalMap : OsmInstance.OpenStreetMap;
            if (keyCode.endsWith("_all_wd")) {
                // Search all elements with a linked entity key (all wikidata_keys, *:wikidata=*) and/or with wikidata=*
                osm_wikidata_keys = this.preset.osm_wikidata_keys;
                relation_member_role = this.preset.relation_member_role;
                search_text_key = this.preset.osm_text_key;
                use_wikidata = true;
            } else if (keyCode.endsWith("_all")) {
                // Search all elements with a linked entity key (all wikidata_keys, *:wikidata=*)
                osm_wikidata_keys = this.preset.osm_wikidata_keys;
                relation_member_role = this.preset.relation_member_role;
                search_text_key = this.preset.osm_text_key;
                use_wikidata = false;
            } else if (keyCode.endsWith("_rel_role")) {
                // Search elements members with a specific role in a linked entity relationship
                if (!this.preset.relation_member_role)
                    throw new Error(`relation_member_role is empty, invalid backEndID: "${backEndID}"`);
                else
                    relation_member_role = this.preset.relation_member_role;
                osm_wikidata_keys = [];
                search_text_key = undefined;
                use_wikidata = false;
            } else if (this.wikidata_key_codes && (keyCode in this.wikidata_key_codes)) {
                // Search a specific linked entity key (*:wikidata=*)
                osm_wikidata_keys = [this.wikidata_key_codes[keyCode]];
                search_text_key = undefined;
                use_wikidata = false;
            } else {
                console.error("Invalid Overpass back-end ID", { backEndID, keyCode, keyCodes: this.wikidata_key_codes });
                throw new Error(`Invalid Overpass back-end ID: "${backEndID}"`);
            }
        }

        const timerID = new Date().getMilliseconds();
        console.time(`overpass_query_${timerID}`);
        const query = this.buildOverpassQuery(osm_wikidata_keys, bbox, search_text_key, relation_member_role, use_wikidata, onlyCentroids, year),
            { overpassJson } = await import("overpass-ts"),
            res = await overpassJson(query, { endpoint: process.env.NEXT_PUBLIC_OWMF_overpass_api_url });
        console.timeEnd(`overpass_query_${timerID}`);
        console.debug(`Overpass fetchMapData found ${res.elements?.length} ELEMENTS`, res.elements);

        if (!res.elements && res.remark)
            throw new Error(`Overpass API error: ${res.remark}`);
        if (!res.elements)
            throw new Error("No elements in Overpass response");

        this.prepareRelationMemberAreas(res);

        console.time(`overpass_transform_${timerID}`);
        const out: OwmfResponse = osmtogeojson(res, { flatProperties: false, verbose: true });
        console.debug(`Overpass fetchMapData found ${out.features.length} FEATURES`);
        // console.table(out.features);

        out.features.forEach(f => this.transformFeature(f, osm_wikidata_keys, osmInstance));
        out.site = osmInstance;
        out.overpass_query = query;
        out.timestamp = new Date().toISOString();
        out.bbox = bbox;
        out.sourcePresetID = this.preset.id;
        out.backEndID = backEndID;
        out.onlyCentroids = onlyCentroids;
        out.year = year;
        out.truncated = res.elements?.length === this.maxElements;
        console.timeEnd(`overpass_transform_${timerID}`);

        return out;
    }

    /**
     * Non-multi-polygon OSM relations like type=site are not supported by osmtogeojson and would be lost
     * To avoid losing information, propagate tags to their members
     * 
     * @see https://github.com/tyrasd/osmtogeojson/issues/75
     */
    private prepareRelationMemberAreas(res: OverpassJson) {
        if (!this.preset.relation_propagation_type) return;

        res.elements.forEach(rel => {
            if (rel.type !== "relation" || rel.tags?.type !== this.preset.relation_propagation_type) return;

            rel.members.forEach(member => {
                const ele = res.elements?.find(ele => ele.id === member.ref && ele.type === member.type);
                if (ele?.type !== "node" && ele?.type !== "way" && ele?.type !== "relation") return;
                ele.tags ??= {};

                /*
                Little dirty trick to show correctly areas.
                They would otherwise be shown as lines because tags are not sent for member ways
                */
                if (ele.type === "way") ele.tags.area ??= "yes";
            });
        });
    }

    private transformFeature(feature: OwmfFeature, osm_keys: string[], site: OsmInstance) {
        if (!feature.properties)
            feature.properties = {};

        // osmtogeojson initializes feature.properties.id with the full OSM ID (osm_type/osm_id)
        const full_osm_props_id = typeof feature.properties.id === "string" && feature.properties.id.includes("/") ? feature.properties.id : undefined,
            full_osm_base_id = typeof feature.id === "string" && feature.id.includes("/") ? feature.id : undefined,
            full_osm_id = full_osm_base_id ?? full_osm_props_id,
            osmSplit = full_osm_id?.split("/"),
            osm_type = osmSplit?.length ? osmSplit[0] as OsmType : undefined,
            osm_id = osmSplit?.length ? parseInt(osmSplit[1]) : undefined,
            tags = createFeatureTags(feature);
        feature.id = `${site}/${full_osm_id}`;
        feature.properties.id = feature.id; // Copying the ID as sometimes Maplibre erases feature.id
        feature.properties.from_wikidata = false;
        feature.properties.from_osm_instance = site;
        if (site === OsmInstance.OpenStreetMap) {
            feature.properties.osm_id = osm_id;
            feature.properties.osm_type = osm_type;
        } else {
            feature.properties.ohm_id = osm_id;
            feature.properties.ohm_type = osm_type;
        }

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

        if (tags.wikimedia_commons)
            feature.properties.commons = COMMONS_CATEGORY_REGEX.exec(tags.wikimedia_commons)?.at(1);

        if (tags.wikimedia_commons && COMMONS_FILE_REGEX.test(tags.wikimedia_commons))
            feature.properties.picture = tags.wikimedia_commons;
        else if (tags.image && COMMONS_FILE_REGEX.test(tags.image))
            feature.properties.picture = tags.image;

        const linkedEntities: LinkedEntity[] = [];
        if (!!this.preset?.osm_text_key || !!this.preset.osm_description_key) {
            const linkedNames = this.preset.osm_text_key ? tags[this.preset.osm_text_key]?.split(";") : undefined,
                linkedDescriptions = this.preset.osm_description_key ? tags[this.preset.osm_description_key]?.split(";") : undefined;
            if (linkedNames) {
                linkedEntities.push(...this.textLinkedEntities(site, linkedNames, linkedDescriptions, osm_type, osm_id));
            } else if (linkedDescriptions) {
                linkedEntities.push(...this.textLinkedEntities(site, linkedDescriptions, undefined, osm_type, osm_id));
            }

            if (feature.properties.relations && this.preset?.relation_propagation_role) {
                const relationsWithLinkedNames = feature.properties.relations.filter(rel => (
                    rel.role &&
                    this.preset.relation_propagation_role === rel.role &&
                    ((!!this.preset.osm_text_key && !!rel.reltags[this.preset.osm_text_key]) || (!!this.preset.osm_description_key && !!rel.reltags[this.preset.osm_description_key]))
                ));
                relationsWithLinkedNames.forEach(rel => {
                    const relationLinkedNames = this.preset.osm_text_key ? rel.reltags[this.preset.osm_text_key]?.split(";") : undefined,
                        relationLinkedDescriptions = this.preset.osm_description_key ? rel.reltags[this.preset.osm_description_key]?.split(";") : undefined;
                    if (relationLinkedNames)
                        linkedEntities.push(...this.textLinkedEntities(site, relationLinkedNames, relationLinkedDescriptions, "relation", rel.rel));
                    else if (relationLinkedDescriptions)
                        linkedEntities.push(...this.textLinkedEntities(site, relationLinkedDescriptions, undefined, "relation", rel.rel));
                });
            }
        }

        osm_keys.forEach(key => {
            linkedEntities.push(
                ...tags[key]
                    ?.split(";")
                    ?.filter(value => WIKIDATA_QID_REGEX.test(value))
                    ?.map<LinkedEntity>(value => ({
                        from_osm_instance: site,
                        from_osm_id: osm_id,
                        from_osm_type: osm_type,
                        from_wikidata: false,
                        propagated: false,
                        wikidata: value
                    })) ?? []);

            if (!!this.preset.relation_propagation_role || !!this.preset.relation_propagation_type) {
                feature.properties
                    ?.relations
                    ?.forEach(rel => {
                        const propagateByType = !!rel.reltags?.type && this.preset.relation_propagation_type === rel.reltags?.type,
                            propagateByRole = !!rel.role && this.preset.relation_propagation_role === rel.role;
                        if (!propagateByType && !propagateByRole) return; // No need to propagate anything

                        const linkedEntityQIDs = rel.reltags[key],
                            validLinkedQIDs = !!linkedEntityQIDs && WIKIDATA_QID_REGEX.test(linkedEntityQIDs);
                        if (!validLinkedQIDs) return; // Secondary wikidata tag not available on the relation or invalid => No linked entity to propagate

                        console.debug("Overpass transformFeature propagating linked entity from relation", { feature, rel });
                        linkedEntityQIDs
                            .split(";")
                            .filter(value => WIKIDATA_QID_REGEX.test(value))
                            .reduce((acc, value) => {
                                if (acc.some(e => e.wikidata === value)) {
                                    console.debug("Skipping duplicate linked entity from relation:", { value, feature });
                                } else {
                                    acc.push({
                                        from_osm_instance: site,
                                        from_osm_id: rel.rel,
                                        from_osm_type: "relation",
                                        from_wikidata: false,
                                        propagated: false,
                                        wikidata: value,
                                    });
                                }
                                return acc;
                            }, linkedEntities);

                        // Propagate names
                        Object.keys(rel.reltags)
                            .filter(nameKey => nameKey.startsWith("name"))
                            .forEach(nameKey => tags[nameKey] ??= rel.reltags[nameKey]);
                        tags.description ??= rel.reltags.description;

                        // Propagate primary wikidata tag
                        if (rel.reltags.wikidata && WIKIDATA_QID_REGEX.test(rel.reltags.wikidata))
                            feature.properties!.wikidata ??= rel.reltags.wikidata;
                    });
            }
        });

        if (this.preset.relation_member_role) {
            feature.properties.relations
                ?.filter(rel => rel.role === this.preset.relation_member_role)
                ?.forEach(rel => {
                    const relWikidataQID = rel.reltags?.wikidata && WIKIDATA_QID_REGEX.test(rel.reltags.wikidata) ? rel.reltags.wikidata : undefined,
                        entityAlreadyLinked = !!relWikidataQID && linkedEntities.some(e => e.wikidata === relWikidataQID);
                    if (!entityAlreadyLinked) {
                        linkedEntities.push({
                            name: rel.reltags?.name,
                            description: rel.reltags?.description,
                            birth_date: rel.reltags?.born,
                            birth_date_precision: DatePrecision.day,
                            birth_place: rel.reltags?.birthplace,
                            death_date: rel.reltags?.died,
                            death_date_precision: DatePrecision.day,
                            death_place: rel.reltags?.deathplace,
                            wikidata: relWikidataQID,
                            from_osm_instance: site,
                            from_osm_type: "relation",
                            from_osm_id: rel.rel,
                            from_wikidata: false,
                            osm_wd_join_field: "OSM"
                        });
                    }
                });
        }

        feature.properties.linked_entities = linkedEntities.length ? linkedEntities : undefined;
        feature.properties.linked_entity_count = linkedEntities.length;
    }

    private textLinkedEntities(site: OsmInstance, names: string[], descriptions?: string[], osm_type?: OsmType, osm_id?: number): LinkedEntity[] {
        return names.map((name, i) => ({
            name: name,
            description: descriptions?.[i],
            from_osm_instance: site,
            from_osm_id: osm_id,
            from_osm_type: osm_type,
            from_wikidata: false,
            propagated: false
        }));
    }

    private buildOverpassQuery(
        wd_keys: string[],
        bbox: BBox,
        osm_text_key: string | undefined,
        relation_member_role: string | undefined,
        use_wikidata: boolean,
        onlyCentroids: boolean,
        year: number
    ): string {
        // See https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/CONTRIBUTING.md#user-content-excluded-elements
        const maxMembersFilter = this.maxRelationMembers ? `(if:count_members() < ${this.maxRelationMembers})` : "",
            notTooBig = this.preset.ignore_big_elements ? `[!"sqkm"][!"boundary"]["type"!="boundary"]` : "",
            dateFilters = process.env.NEXT_PUBLIC_OWMF_enable_open_historical_map !== "true" || year === new Date().getFullYear() ? [
                // Filter for openstreetmap.org or openhistoricalmap.org in the current year
                '[!"end_date"]["route"!="historic"]'
            ] : [
                // Filter for openhistoricalmap.org in another year
                // See https://wiki.openstreetmap.org/wiki/OpenHistoricalMap/Overpass#Theatres_in_a_given_year
                '[!"start_date"][!"end_date"]',
                `["start_date"](if:t["start_date"] < "${year}" && (!is_tag("end_date") || t["end_date"] >= "${year}"))`
            ],
            filter_tags = this.preset?.osm_filter_tags?.map(tag => tag.replace("=*", "")),
            text_etymology_key_is_filter = osm_text_key && (!filter_tags || filter_tags.includes(osm_text_key)),
            filter_wd_keys = filter_tags ? wd_keys.filter(key => filter_tags.includes(key)) : wd_keys,
            non_filter_wd_keys = wd_keys.filter(key => !filter_tags?.includes(key));
        console.debug("buildOverpassQuery", { filter_wd_keys, wd_keys, filter_tags, non_filter_wd_keys, osm_text_key });
        let query = `
[out:json][timeout:40][bbox:${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]}];
(
// Filter tags: ${filter_tags?.length ? filter_tags.join(", ") : "NONE"}
// Secondary Wikidata keys: ${wd_keys.length ? wd_keys.join(", ") : "NONE"}
// Text key: ${osm_text_key ?? "NONE"}
// Relation membership link role: ${relation_member_role ?? "NONE"}
// ${use_wikidata ? "F" : "NOT f"}etching also elements with wikidata=*
// Max relation members: ${this.maxRelationMembers ?? "UNLIMITED"}
// Year: ${year}
`;

        dateFilters.forEach((dateFilter) => {
            const commonFilters = `${notTooBig}${maxMembersFilter}${dateFilter}`;
            filter_wd_keys.forEach(
                key => query += `nwr${commonFilters}["${key}"]; // filter & secondary wikidata key\n`
            );
            if (text_etymology_key_is_filter)
                query += `nwr${commonFilters}["${osm_text_key}"]; // filter & text etymology key\n`;
            if (use_wikidata && !filter_tags && !osm_text_key)
                query += `nwr${commonFilters}["wikidata"];\n`;

            filter_tags?.forEach(filter_tag => {
                const filter_split = filter_tag.split("="),
                    filter_key = filter_split[0],
                    filter_value = filter_split[1],
                    filter_clause = filter_value ? `"${filter_key}"="${filter_value}"` : `"${filter_key}"`;

                if (!wd_keys.includes(filter_key) && osm_text_key !== filter_key) {
                    non_filter_wd_keys.forEach(
                        key => query += `nwr${commonFilters}[${filter_clause}]["${key}"]; // filter + secondary wikidata key\n`
                    );
                    if (osm_text_key && !text_etymology_key_is_filter)
                        query += `nwr${commonFilters}[${filter_clause}]["${osm_text_key}"]; // filter + text etymology key\n`;
                    if (use_wikidata)
                        query += `nwr${commonFilters}[${filter_clause}]["wikidata"]; // filter + wikidata=*\n`;
                }
            });

            if (relation_member_role)
                query += `nwr${commonFilters}(if:count_by_role("${relation_member_role}") > 0); // relation as linked entity \n`;
        });

        const outClause = onlyCentroids ? `out ids center ${this.maxElements ?? ""};` : `out body ${this.maxElements ?? ""}; >; out skel qt;`;
        query += `);
// Max elements: ${this.maxElements ?? "NONE"}
${outClause}
`;

        return query;
    }
}