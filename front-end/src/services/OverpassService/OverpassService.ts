import type { BBox } from "geojson";
import osmtogeojson from "osmtogeojson";
import type { OverpassJson } from "overpass-ts";
import { type OwmfResponse } from "../../model/OwmfResponse";
import { BaseOsmMapService } from "../BaseOsmMapService";

/**
 * Service that handles the creation of Overpass QL queries and the execution of them on the appropriate instance of Overpass
 * 
 * @see https://wiki.openstreetmap.org/wiki/Overpass_API
 * @see https://wiki.openstreetmap.org/wiki/OpenHistoricalMap/Overpass
 */
export class OverpassService extends BaseOsmMapService {
    public canHandleBackEnd(backEndID: string): boolean {
        if (!process.env.NEXT_PUBLIC_OWMF_osm_instance_url || !process.env.NEXT_PUBLIC_OWMF_overpass_api_url)
            return false;

        if (this.preset?.osm_wikidata_keys)
            return /^overpass_osm_(wd|all_wd|all|rel_role|[_a-z]+)$/.test(backEndID);

        return "overpass_osm_wd" === backEndID;
    }

    protected async buildAndExecuteQuery(
        osm_wd_keys: string[],
        bbox: BBox,
        osm_text_key: string | undefined,
        relation_member_role: string | undefined,
        use_wikidata: boolean,
        onlyCentroids: boolean,
        year: number
    ): Promise<OwmfResponse> {
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
        const query = this.buildOverpassQuery(osm_wd_keys, trueBBox, osm_text_key, relation_member_role, use_wikidata, onlyCentroids, year),
            { overpassJson } = await import("overpass-ts"),
            res = await overpassJson(query, { endpoint: process.env.NEXT_PUBLIC_OWMF_overpass_api_url });
        console.timeEnd(`overpass_query_${timerID}`);
        console.debug(`Overpass fetchMapData found ${res.elements?.length} ELEMENTS`, { bbox, trueBBox, elements: res.elements });

        if (!res.elements && res.remark)
            throw new Error(`Overpass API error: ${res.remark}`);

        this.prepareRelationMemberAreas(res);

        console.time(`overpass_transform_${timerID}`);
        const out: OwmfResponse = osmtogeojson(res, { flatProperties: false, verbose: true });
        console.debug(`Overpass fetchMapData found ${out.features.length} FEATURES`);
        // console.table(out.features);

        out.overpass_query = query;
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
        if (!this.preset.relation_propagation_type || !res.elements?.length) return;

        res.elements.forEach(rel => {
            if (rel.type !== "relation" || rel.tags?.type !== this.preset.relation_propagation_type) return;

            rel.members.forEach(memberRef => {
                const memberElement = res.elements.find(ele => ele.id === memberRef.ref && ele.type === memberRef.type);
                if (memberElement?.type !== "node" && memberElement?.type !== "way" && memberElement?.type !== "relation") return;

                /*
                Little dirty trick to show correctly areas.
                They would otherwise be shown as lines because tags are not sent for member ways
                */
                if (memberElement.type === "way") {
                    memberElement.tags ??= {};
                    memberElement.tags.area ??= "yes";
                }
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
            osm_text_key_is_filter = !!osm_text_key && (!filter_tags || filter_tags.includes(osm_text_key)),
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
            if (!filter_tags && !wd_keys.length && !osm_text_key)
                query += `nwr${commonFilters}["wikidata"];\n`; // Base preset, no filters nor linked entities => Get only items with wikidata=*

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

                    if (process.env.NEXT_PUBLIC_OWMF_require_wikidata_link !== "true" && !wd_keys.length && !osm_text_key)
                        query += `nwr${commonFilters}[${filter_clause}]; // filter only\n`;
                    else if (use_wikidata)
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