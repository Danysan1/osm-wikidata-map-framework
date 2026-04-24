import type { BBox } from "geojson";
import { type OwmfResponse } from "../../model/OwmfResponse";
import { BaseOsmMapService } from "../BaseOsmMapService";

/**
 * Service that handles the creation of Postpass SQL queries and the execution of them on the appropriate instance of Postpass
 * 
 * @see https://wiki.openstreetmap.org/wiki/Postpass
 */
export class PostpassService extends BaseOsmMapService {
    public canHandleBackEnd(backEndID: string): boolean {
        let out: boolean;
        if (!process.env.NEXT_PUBLIC_OWMF_osm_instance_url || !process.env.NEXT_PUBLIC_OWMF_postpass_api_url)
            out = false;
        else if (backEndID.endsWith("rel_role"))
            out = false;
        else if (this.preset?.osm_wikidata_keys)
            out = /^postpass_osm_(wd|all_wd|all|[_a-z]+)$/.test(backEndID);
        else
            out = "postpass_osm_wd" === backEndID;
        console.debug("Postpass canHandleBackEnd", backEndID, out);
        return out;
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
        const timerID = new Date().getMilliseconds();
        console.time(`postpass_query_${timerID}`);
        const query = this.buildPostpassSqlQuery(osm_wd_keys, bbox, osm_text_key, use_wikidata, onlyCentroids, year),
            res = await fetch(process.env.NEXT_PUBLIC_OWMF_postpass_api_url!, {
                method: "POST",
                body: new URLSearchParams({ 'data': query })
            }),
            out = await res.json() as OwmfResponse;
        console.timeEnd(`postpass_query_${timerID}`);
        console.debug(`Postpass fetchMapData found ${out.features?.length} ELEMENTS`, out.features);

        out.postpass_query = query;
        console.timeEnd(`postpass_transform_${timerID}`);

        return out;
    }

    private buildPostpassSqlQuery(
        osm_wd_keys: string[],
        bbox: BBox,
        osm_text_key: string | undefined,
        use_wikidata: boolean,
        onlyCentroids: boolean,
        year: number
    ): string {
        // See https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/CONTRIBUTING.md#user-content-excluded-elements
        const notTooBig = this.preset.ignore_big_elements ? "AND NOT tags ? 'sqkm' AND NOT tags ? 'boundary' AND (NOT tags ? 'place' OR tags->>'place' NOT IN ('island','archipelago'))" : "", // Postpass/osm2pgsql data does not include type=* tags, no check necessary
            dateFilter = year === null || isNaN(year) ?
                // Filter without year filtering (ex. for openstreetmap.org)
                "NOT tags ? 'end_date' AND (NOT tags ? 'route' OR tags->>'route'!='historic')"
                :
                // Filter in a specific year (ex. for openhistoricalmap.org)
                `(NOT tags ? 'start_date' OR tags->>'start_date' <= '${year}') AND (NOT tags ? 'end_date' OR tags->>'end_date' >= '${year}')`
            ,
            filter_tags = this.preset?.osm_filter_tags?.map(tag => tag.replace("=*", "")),
            osm_text_key_is_filter = osm_text_key && (!filter_tags || filter_tags.includes(osm_text_key)),
            filter_wd_keys = filter_tags ? osm_wd_keys.filter(key => filter_tags.includes(key)) : osm_wd_keys;

        /**
         * Filter clause that requires the element to potentially have a linked entity.
         * This is checked by requiring either
         * - a secondary Wikidata key (but only if it's not also a filter key, because filter linked entity keys are sufficient on their own to include an element through the tag filters below) or
         * - a textual entity key (but only if it's not also a filter key, for the same reason) or
         * - if use_wikidata is true, the presence of a wikidata=* tag
         */
        let linked_entity_clause = "";
        if (this.preset.require_wikidata_link) {
            const non_filter_wd_keys = osm_wd_keys.filter(key => !filter_tags?.includes(key)),
                linked_entity_clauses = non_filter_wd_keys.map(key => `tags ? '${key}'`);
            if (osm_text_key && !osm_text_key_is_filter)
                linked_entity_clauses.push(`tags ? '${osm_text_key}'`);

            if (use_wikidata)
                linked_entity_clauses.push(`tags ? 'wikidata'`);
            
            if (!linked_entity_clauses.length) {
                console.warn("PostpassService: preset requires Wikidata link, overriding use_wikidata to true", this.preset);
                linked_entity_clauses.push(`tags ? 'wikidata'`);
            }

            linked_entity_clause = linked_entity_clauses.length ? `AND (${linked_entity_clauses.join(" OR ")})` : "";
        }

        /**
         * If there are wikidata/textual linked entity keys that are also filter keys, these are sufficient on their own to ensure that an element has a linked entity, so we don't need to include the linked entity clause for elements that match these tag filters.
         * In this case we need to print these filter linked clauses on their own without the linked entity clause, and then include the linked entity clause in the other filter clauses to ensure that we don't get elements that match the tag filters but don't have a Wikidata link.
         * Otherwise, we can apply this clause once to all elements without repeating it in every tag filter clause.
         */
        const same_linked_entity_clause_for_all = !filter_wd_keys.length && !osm_text_key_is_filter,
            tagFilters = filter_wd_keys.map(key => `tags ? '${key}'`);
        if (osm_text_key_is_filter)
            tagFilters.push(`tags ? '${osm_text_key}'`);
        filter_tags?.forEach(filter_tag => {
            const filter_split = filter_tag.split("="),
                filter_key = filter_split[0],
                filter_value = filter_split[1];

            if (!osm_wd_keys.includes(filter_key) && osm_text_key !== filter_key) {
                const filter_clause = filter_value ? `tags->>'${filter_key}'='${filter_value}'` : `tags ? '${filter_key}'`;
                tagFilters.push(same_linked_entity_clause_for_all ? filter_clause : `(${filter_clause} ${linked_entity_clause})`);
            }
        });
        const tagFilterClause = tagFilters.length ? `AND (${tagFilters.join(" OR ")}) -- Tag filters` : "";

        let query = `
-- Filter tags: ${filter_tags?.length ? filter_tags.join(", ") : "NONE"}
-- Secondary Wikidata keys: ${osm_wd_keys.length ? osm_wd_keys.join(", ") : "NONE"}
-- Text key: ${osm_text_key ?? "NONE"}
-- ${use_wikidata ? "F" : "NOT f"}etching also elements with wikidata=*
-- Max relation members: ${this.maxRelationMembers ?? "UNLIMITED"}
-- Year: ${year === null || isNaN(year) ? "CURRENT" : year}
-- Max elements: ${this.maxElements ?? "NONE"}
SELECT osm_type, osm_id, ${onlyCentroids ? "ST_Centroid(geom)" : "tags, geom"} 
FROM postpass_pointlinepolygon
WHERE ${dateFilter}
${notTooBig}
${same_linked_entity_clause_for_all ? linked_entity_clause : ""}
${tagFilterClause}
AND geom && ST_SetSRID(ST_MakeBox2D(ST_MakePoint(${bbox[0]},${bbox[1]}), ST_MakePoint(${bbox[2]},${bbox[3]})), 4326)
`;

        if (this.maxElements)
            query += `LIMIT ${this.maxElements}`

        console.debug("buildPostpassSqlQuery", { query, filter_tags, filter_wd_keys, osm_wd_keys, osm_text_key, linked_entity_clause, tagFilters });
        return query;
    }
}