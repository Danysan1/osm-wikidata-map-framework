import { OSM_INSTANCE } from "@/src/config";
import type { BBox } from "geojson";
import osmtogeojson from "osmtogeojson";
import type { OverpassJson } from "overpass-ts";
import { type OwmfResponse } from "../../model/OwmfResponse";
import { BaseOverpassService } from "../BaseOverpassService";

/**
 * Service that handles the creation of Overpass QL queries and the execution of them on the appropriate instance of Overpass
 * 
 * @see https://wiki.openstreetmap.org/wiki/Overpass_API
 * @see https://wiki.openstreetmap.org/wiki/OpenHistoricalMap/Overpass
 */
export class OverpassService extends BaseOverpassService {
    public canHandleBackEnd(backEndID: string): boolean {
        if (!process.env.NEXT_PUBLIC_OWMF_osm_instance_url || !process.env.NEXT_PUBLIC_OWMF_overpass_api_url)
            return false;

        if (this.preset?.osm_wikidata_keys)
            return /^overpass_(osm|ohm)_(wd|all_wd|all|rel_role|[_a-z]+)$/.test(backEndID);

        return /^overpass_(osm|ohm)_wd$/.test(backEndID);
    }

    protected async fetchMapData(backEndID: string, onlyCentroids: boolean, bbox: BBox, year: number): Promise<OwmfResponse> {
        let osm_wikidata_keys: string[] = [],
            use_wikidata = false,
            relation_member_role: string | undefined,
            search_text_key: string | undefined;

        if (backEndID.includes("overpass_osm_wd")) {
            // Search only elements with wikidata=*
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

        const trueBBox = bbox.map(coord => {
            if (coord < -180)
                return coord + 360;
            else if (coord > 180)
                return coord - 360;
            else
                return coord;
        }) as BBox;

        const timerID = new Date().getMilliseconds();
        console.time(`overpass_query_${timerID}`);
        const query = this.buildOverpassQuery(osm_wikidata_keys, trueBBox, search_text_key, relation_member_role, use_wikidata, onlyCentroids, year),
            { overpassJson } = await import("overpass-ts"),
            res = await overpassJson(query, { endpoint: process.env.NEXT_PUBLIC_OWMF_overpass_api_url });
        console.timeEnd(`overpass_query_${timerID}`);
        console.debug(`Overpass fetchMapData found ${res.elements?.length} ELEMENTS`, { bbox, trueBBox, elements: res.elements });

        if (!res.elements && res.remark)
            throw new Error(`Overpass API error: ${res.remark}`);
        if (!res.elements)
            throw new Error("No elements in Overpass response");

        this.prepareRelationMemberAreas(res);

        console.time(`overpass_transform_${timerID}`);
        const out: OwmfResponse = osmtogeojson(res, { flatProperties: false, verbose: true });
        console.debug(`Overpass fetchMapData found ${out.features.length} FEATURES`);
        // console.table(out.features);

        out.features.forEach(f => this.transformFeature(f, osm_wikidata_keys));
        out.osmInstance = OSM_INSTANCE;
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
            osm_text_key_is_filter = osm_text_key && (!filter_tags || filter_tags.includes(osm_text_key)),
            filter_wd_keys = filter_tags ? wd_keys.filter(key => filter_tags.includes(key)) : wd_keys,
            non_filter_wd_keys = wd_keys.filter(key => !filter_tags?.includes(key));

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
            if (osm_text_key_is_filter)
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
                    if (osm_text_key && !osm_text_key_is_filter)
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

        console.debug("buildOverpassQuery", { query, filter_wd_keys, wd_keys, filter_tags, non_filter_wd_keys, osm_text_key, bbox });
        return query;
    }
}