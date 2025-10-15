import type { BBox } from "geojson";
import { type OwmfResponse } from "../../model/OwmfResponse";
import { BaseOverpassService } from "../BaseOverpassService";
import { OSM_INSTANCE } from "@/src/config";

/**
 * Service that handles the creation of Postpass SQL queries and the execution of them on the appropriate instance of Postpass
 * 
 * @see https://wiki.openstreetmap.org/wiki/Postpass
 */
export class PostpassService extends BaseOverpassService {
    public canHandleBackEnd(backEndID: string): boolean {
        let out: boolean;
        if (!process.env.NEXT_PUBLIC_OWMF_osm_instance_url || !process.env.NEXT_PUBLIC_OWMF_postpass_api_url)
            out = false;
        else if (this.preset?.osm_wikidata_keys)
            out = /^postpass_(osm|ohm)_(wd|all_wd|all|rel_role|[_a-z]+)$/.test(backEndID);
        else
            out = /^postpass_(osm|ohm)_wd$/.test(backEndID);
        console.debug("Postpass canHandleBackEnd", backEndID, out);
        return out;
    }

    protected async fetchMapData(backEndID: string, onlyCentroids: boolean, bbox: BBox, year: number): Promise<OwmfResponse> {
        let osm_wikidata_keys: string[] = [],
            use_wikidata = false,
            search_text_key: string | undefined;

        if (backEndID.includes("postpass_osm_wd")) {
            // Search only elements with wikidata=*
            osm_wikidata_keys = [];
            search_text_key = undefined;
            use_wikidata = true;
        } else if (!this.preset?.osm_wikidata_keys) {
            throw new Error(`No Wikidata keys configured, invalid Postpass back-end ID: "${backEndID}"`)
        } else {
            const backEndSplitted = /^.*postpass_((?:osm|ohm)_[_a-z]+)$/.exec(backEndID),
                keyCode = backEndSplitted?.at(1);

            console.debug("Postpass fetchMapData", { backEndID, sourceKeyCode: keyCode, wikidata_key_codes: this.wikidata_key_codes });
            if (!keyCode)
                throw new Error(`Failed to extract keyCode from back-end ID: "${backEndID}"`);

            if (keyCode.endsWith("_all_wd")) {
                // Search all elements with a linked entity key (all wikidata_keys, *:wikidata=*) and/or with wikidata=*
                osm_wikidata_keys = this.preset.osm_wikidata_keys;
                search_text_key = this.preset.osm_text_key;
                use_wikidata = true;
            } else if (keyCode.endsWith("_all")) {
                // Search all elements with a linked entity key (all wikidata_keys, *:wikidata=*)
                osm_wikidata_keys = this.preset.osm_wikidata_keys;
                search_text_key = this.preset.osm_text_key;
                use_wikidata = false;
            } else if (keyCode.endsWith("_rel_role")) {
                throw new Error("Relation member role query is not supported in Postpass")
            } else if (this.wikidata_key_codes && (keyCode in this.wikidata_key_codes)) {
                // Search a specific linked entity key (*:wikidata=*)
                osm_wikidata_keys = [this.wikidata_key_codes[keyCode]];
                search_text_key = undefined;
                use_wikidata = false;
            } else {
                console.error("Invalid Postpass back-end ID", { backEndID, keyCode, keyCodes: this.wikidata_key_codes });
                throw new Error(`Invalid Postpass back-end ID: "${backEndID}"`);
            }
        }

        const timerID = new Date().getMilliseconds();
        console.time(`postpass_query_${timerID}`);
        const query = this.buildPostpassSqlQuery(osm_wikidata_keys, bbox, search_text_key, use_wikidata, onlyCentroids, year),
            res = await fetch(process.env.NEXT_PUBLIC_OWMF_postpass_api_url!, {
                method: "POST",
                body: new URLSearchParams({ 'data': query })
            }),
            out = await res.json() as OwmfResponse;
        console.timeEnd(`postpass_query_${timerID}`);
        console.debug(`Postpass fetchMapData found ${out.features?.length} ELEMENTS`, out.features);

        if (!out.features?.length)
            throw new Error("No elements in Postpass response");

        out.features.forEach(f => this.transformFeature(f, osm_wikidata_keys));
        out.osmInstance = OSM_INSTANCE;
        out.postpass_query = query;
        out.timestamp = new Date().toISOString();
        out.bbox = bbox;
        out.sourcePresetID = this.preset.id;
        out.backEndID = backEndID;
        out.onlyCentroids = onlyCentroids;
        out.year = year;
        out.truncated = out.features.length === this.maxElements;
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
        const notTooBig = this.preset.ignore_big_elements ? "AND NOT tags ? 'sqkm' AND NOT tags ? 'boundary' AND (NOT tags ? 'type' OR tags->>'type'!='boundary')" : "",
            dateFilter = process.env.NEXT_PUBLIC_OWMF_enable_open_historical_map !== "true" || year === new Date().getFullYear() ?
                // Filter for openstreetmap.org or openhistoricalmap.org in the current year
                "NOT tags ? 'end_date' AND (NOT tags ? 'route' OR tags->>'route'!='historic')"
                :
                // Filter for openhistoricalmap.org in another year
                // See https://wiki.openstreetmap.org/wiki/OpenHistoricalMap/Overpass#Theatres_in_a_given_year
                `(NOT tags ? 'start_date' AND NOT tags ? 'end_date') OR (tags->>'start_date' < ${year} AND (NOT tags ? 'end_date' OR tags->>'end_date' >= ${year}))`
            ,
            filter_tags = this.preset?.osm_filter_tags?.map(tag => tag.replace("=*", "")),
            text_etymology_key_is_filter = osm_text_key && (!filter_tags || filter_tags.includes(osm_text_key)),
            filter_wd_keys = filter_tags ? osm_wd_keys.filter(key => filter_tags.includes(key)) : osm_wd_keys,
            non_filter_wd_keys = osm_wd_keys.filter(key => !filter_tags?.includes(key));

        let tagFilters = filter_wd_keys.map(key => `tags ? '${key}'`).join(" OR ");
        if (text_etymology_key_is_filter)
            tagFilters += ` OR tags ? '${osm_text_key}'`;
        if (use_wikidata && !filter_tags && !osm_text_key)
            tagFilters += ` OR tags ? 'wikidata'`;

        filter_tags?.forEach(filter_tag => {
            const filter_split = filter_tag.split("="),
                filter_key = filter_split[0],
                filter_value = filter_split[1];

            if (!osm_wd_keys.includes(filter_key) && osm_text_key !== filter_key) {
                const filter_clause = filter_value ? `tags->>'${filter_key}'='${filter_value}'` : `tags ? '${filter_key}'`;
                let non_filter_wd_clause = non_filter_wd_keys.map(key => `tags ? '${key}'`).join(" OR ");
                if (osm_text_key && !text_etymology_key_is_filter)
                    non_filter_wd_clause += `tags ? '${osm_text_key}'`;
                if (use_wikidata)
                    non_filter_wd_clause += `tags ? 'wikidata'`;
                tagFilters += non_filter_wd_clause ? ` OR (${filter_clause} AND (${non_filter_wd_clause}))` : ` OR ${filter_clause}`;
            }
        });
        console.debug("buildOverpassQuery", { filter_wd_keys, wd_keys: osm_wd_keys, filter_tags, non_filter_wd_keys, osm_text_key, tagFilters });
        let query = `
-- Filter tags: ${filter_tags?.length ? filter_tags.join(", ") : "NONE"}
-- Secondary Wikidata keys: ${osm_wd_keys.length ? osm_wd_keys.join(", ") : "NONE"}
-- Text key: ${osm_text_key ?? "NONE"}
-- ${use_wikidata ? "F" : "NOT f"}etching also elements with wikidata=*
-- Max relation members: ${this.maxRelationMembers ?? "UNLIMITED"}
-- Year: ${year}
-- Max elements: ${this.maxElements ?? "NONE"}
SELECT osm_type, osm_id, ${onlyCentroids ? "ST_Centroid(geom)" : "tags, geom"} 
FROM postpass_pointlinepolygon
WHERE ${dateFilter}
${notTooBig}
AND (${tagFilters})
AND geom && ST_SetSRID(ST_MakeBox2D(ST_MakePoint(${bbox[0]},${bbox[1]}), ST_MakePoint(${bbox[2]},${bbox[3]})), 4326)
`;

        if (this.maxElements)
            query += `LIMIT ${this.maxElements}`

        return query;
    }
}