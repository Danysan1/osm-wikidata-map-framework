import type { BBox } from "geojson";
import { DatePrecision, LinkedEntity, OsmType } from "../../model/LinkedEntity";
import { createFeatureTags, type OwmfFeature, type OwmfResponse } from "../../model/OwmfResponse";
import { COMMONS_CATEGORY_REGEX, COMMONS_FILE_REGEX } from "../WikimediaCommonsService";
import { BaseOverpassService } from "../BaseOverpassService";
import { OSM_INSTANCE } from "@/src/config";

const WIKIDATA_QID_REGEX = /^Q[0-9]+/;

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
        const query = this.buildOverpassQuery(osm_wikidata_keys, bbox, search_text_key, use_wikidata, onlyCentroids, year),
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

    private transformFeature(feature: OwmfFeature, osm_keys: string[]) {
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
        feature.id = `${OSM_INSTANCE}/${full_osm_id}`;
        feature.properties.id = feature.id; // Copying the ID as sometimes Maplibre erases feature.id
        feature.properties.from_wikidata = false;
        feature.properties.from_osm_instance = OSM_INSTANCE;
        feature.properties.osm_id = osm_id;
        feature.properties.osm_type = osm_type;

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
                linkedEntities.push(...this.textLinkedEntities(linkedNames, linkedDescriptions, osm_type, osm_id));
            } else if (linkedDescriptions) {
                linkedEntities.push(...this.textLinkedEntities(linkedDescriptions, undefined, osm_type, osm_id));
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
                        linkedEntities.push(...this.textLinkedEntities(relationLinkedNames, relationLinkedDescriptions, "relation", rel.rel));
                    else if (relationLinkedDescriptions)
                        linkedEntities.push(...this.textLinkedEntities(relationLinkedDescriptions, undefined, "relation", rel.rel));
                });
            }
        }

        osm_keys.forEach(key => {
            linkedEntities.push(
                ...tags[key]
                    ?.split(";")
                    ?.filter(value => WIKIDATA_QID_REGEX.test(value))
                    ?.map<LinkedEntity>(value => ({
                        from_osm_instance: OSM_INSTANCE,
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

                        console.debug("Postpass transformFeature propagating linked entity from relation", { feature, rel });
                        linkedEntityQIDs
                            .split(";")
                            .filter(value => WIKIDATA_QID_REGEX.test(value))
                            .reduce((acc, value) => {
                                if (acc.some(e => e.wikidata === value)) {
                                    console.debug("Skipping duplicate linked entity from relation:", { value, feature });
                                } else {
                                    acc.push({
                                        from_osm_instance: OSM_INSTANCE,
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
                            from_osm_instance: OSM_INSTANCE,
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

    private textLinkedEntities(names: string[], descriptions?: string[], osm_type?: OsmType, osm_id?: number): LinkedEntity[] {
        return names.map((name, i) => ({
            name: name,
            description: descriptions?.[i],
            from_osm_instance: OSM_INSTANCE,
            from_osm_id: osm_id,
            from_osm_type: osm_type,
            from_wikidata: false,
            propagated: false
        }));
    }

    private buildOverpassQuery(
        osm_wd_keys: string[],
        bbox: BBox,
        osm_text_key: string | undefined,
        use_wikidata: boolean,
        onlyCentroids: boolean,
        year: number
    ): string {
        // See https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/CONTRIBUTING.md#user-content-excluded-elements
        const notTooBig = this.preset.ignore_big_elements ? "NOT tags ? 'sqkm' AND NOT tags ? 'boundary' AND (NOT tags ? 'type' OR tags->>'type'!='boundary')" : "",
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
                tagFilters += ` OR (${filter_clause} AND (${non_filter_wd_clause}))`;
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
SELECT osm_id, tags, geom 
FROM postpass_pointpolygon
WHERE ${dateFilter}
AND ${notTooBig}
AND (${tagFilters})
AND geom && ST_SetSRID(ST_MakeBox2D(ST_MakePoint(${bbox[0]},${bbox[1]}), ST_MakePoint(${bbox[2]},${bbox[3]})), 4326)
`;

        if (this.maxElements)
            query += `LIMIT ${this.maxElements}`

        return query;
    }
}