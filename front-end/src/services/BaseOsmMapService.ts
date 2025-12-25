import { OSM_INSTANCE } from "@/src/config";
import type { BBox } from "geojson";
import type { MapDatabase } from "../db/MapDatabase";
import { DatePrecision, LinkedEntity, OsmType, parseOsmType } from "../model/LinkedEntity";
import { createFeatureTags, osmKeyToKeyID, type OwmfFeature, type OwmfResponse } from "../model/OwmfResponse";
import type { SourcePreset } from "../model/SourcePreset";
import type { MapService } from "./MapService";
import { COMMONS_CATEGORY_REGEX, COMMONS_FILE_REGEX } from "./WikimediaCommonsService";

const WIKIDATA_QID_REGEX = /^Q[0-9]+/;

/**
 * Shared behavior of the services that fetch map data from OSM through Overpass or Postpass
 */
export abstract class BaseOsmMapService implements MapService {
    protected readonly preset: SourcePreset;
    protected readonly maxElements?: number;
    protected readonly maxRelationMembers?: number;
    protected readonly wikidata_key_codes?: Record<string, string>;
    protected readonly db?: MapDatabase;
    protected readonly baseBBox?: BBox;

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
        console.debug("BaseOsmMapService initialized", { preset, maxElements, maxRelationMembers, bbox, wikidata_key_codes: this.wikidata_key_codes });
    }

    public abstract canHandleBackEnd(backEndID: string): boolean;

    public async fetchMapElements(backEndID: string, onlyCentroids: boolean, bbox: BBox, language: string, year: number): Promise<OwmfResponse> {
        language = ''; // Not used in OSM queries

        if (this.baseBBox && (bbox[2] < this.baseBBox[0] || bbox[3] < this.baseBBox[1] || bbox[0] > this.baseBBox[2] || bbox[1] > this.baseBBox[3])) {
            console.warn("BaseOsm fetchMapElements: request bbox does not overlap with the instance bbox", { bbox, baseBBox: this.baseBBox, language });
            return { type: "FeatureCollection", features: [] };
        }

        const cachedResponse = await this.db?.getMap(this.preset?.id, backEndID, onlyCentroids, bbox, language, year);
        if (cachedResponse)
            return cachedResponse;

        console.debug("BaseOsm: No cached response found, fetching", { bbox, sourcePresetID: this.preset?.id, backEndID, onlyCentroids, language });
        const area = Math.abs((bbox[2] - bbox[0]) * (bbox[3] - bbox[1]));
        if (area < 0.000001 || (!onlyCentroids && area > 5)) {
            throw new Error(`Invalid bbox area: ${area} - ${bbox.join(",")}`);
        }

        const out = await this.fetchMapData(backEndID, onlyCentroids, bbox, year);
        if (onlyCentroids) {
            console.debug(`BaseOsm found ${out.features.length} centroids`);
        } else {
            console.debug(`BaseOsm found ${out.features.length} features before filtering`);
            out.features = out.features.filter((feature) => {
                if (feature.properties?.linked_entity_count)
                    return true; // Has some linked entities => keep

                const hasDirectWikidataLink = !!feature.properties?.wikidata || feature.properties?.relations?.some(rel => rel.reltags?.wikidata);
                if (backEndID.endsWith("_wd") && hasDirectWikidataLink)
                    return true; // Feature has a Wikidata entity that may be used to combine with a Wikidata feature to extract a linked entity => Keep

                if (!!this.preset.osm_wikidata_keys?.length || !!this.preset.osm_text_key)
                    return false; // Preset requires linked entities but feature has none => Discard

                if (hasDirectWikidataLink)
                    return true; // Feature has a Wikidata entity and preset does not require linked entities => Keep

                return process.env.NEXT_PUBLIC_OWMF_require_wikidata_link !== "true" && !!this.preset.osm_filter_tags?.length;
            });
            out.total_entity_count = out.features.reduce((acc, feature) => acc + (feature.properties?.linked_entity_count ?? 0), 0);
            console.debug(`BaseOsm found ${out.features.length} features with ${out.total_entity_count} linked entities after filtering`);
        }
        out.language = language;

        void this.db?.addMap(out);
        return out;
    }

    private async fetchMapData(backEndID: string, onlyCentroids: boolean, bbox: BBox, year: number): Promise<OwmfResponse> {
        let osm_wikidata_keys: string[] = [],
            use_wikidata = false,
            relation_member_role: string | undefined,
            search_text_key: string | undefined;
        const backEndSplitted = /^.*pass_(osm_[_a-z]+)$/.exec(backEndID),
            keyCode = backEndSplitted?.at(1);

        if ("osm_wd" === keyCode) {
            // Search only elements with wikidata=*
            osm_wikidata_keys = [];
            search_text_key = undefined;
            use_wikidata = true;
        } else if (!this.preset?.osm_wikidata_keys) {
            throw new Error(`No Wikidata keys configured, invalid back-end ID: "${backEndID}"`)
        } else {
            console.debug("BaseOsm fetchMapData", { backEndID, sourceKeyCode: keyCode, wikidata_key_codes: this.wikidata_key_codes });
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
                console.error("Invalid back-end ID", { backEndID, keyCode, keyCodes: this.wikidata_key_codes });
                throw new Error(`Invalid back-end ID: "${backEndID}"`);
            }
        }

        const out = await this.buildAndExecuteQuery(osm_wikidata_keys, bbox, search_text_key, relation_member_role, use_wikidata, onlyCentroids, year);
        if (!out.features?.length)
            console.warn("No elements in BaseOsm response");

        out.features.forEach(f => this.transformFeature(f, osm_wikidata_keys));
        out.osmInstance = OSM_INSTANCE;
        out.bbox = bbox;
        out.sourcePresetID = this.preset.id;
        out.onlyCentroids = onlyCentroids;
        out.year = year;
        out.backEndID = backEndID;
        out.timestamp = new Date().toISOString();
        out.truncated = out.features.length === this.maxElements;
        return out;
    }

    private transformFeature(feature: OwmfFeature, osm_keys: string[]) {
        feature.properties ??= {};

        let osm_type = parseOsmType(feature.properties.osm_type),
            osm_id = feature.properties.osm_id,
            full_osm_id;

        // osmtogeojson initializes feature.properties.id with the full OSM ID (osm_type/osm_id)
        const full_osm_props_id = typeof feature.properties.id === "string" && feature.properties.id.includes("/") ? feature.properties.id : undefined,
            full_osm_base_id = typeof feature.id === "string" && feature.id.includes("/") ? feature.id : undefined;
        full_osm_id = full_osm_base_id ?? full_osm_props_id;

        if (full_osm_id && (!osm_type || !osm_id)) {
            const osmSplit = full_osm_id?.split("/");
            osm_type = osmSplit?.length ? parseOsmType(osmSplit[0]) : undefined;
            osm_id = osmSplit?.length ? parseInt(osmSplit[1]) : undefined;
        }
        if (!full_osm_id && osm_type && osm_id) {
            full_osm_id = `${osm_type}/${osm_id}`;
        }

        feature.id = `${OSM_INSTANCE}/${full_osm_id}`;
        feature.properties.id = feature.id; // Copying the ID as sometimes Maplibre erases feature.id
        feature.properties.from_wikidata = false;
        feature.properties.from_osm_instance = OSM_INSTANCE;
        feature.properties.osm_id = osm_id;
        feature.properties.osm_type = osm_type;

        const tags = createFeatureTags(feature)
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

                        console.debug("BaseOsm transformFeature propagating linked entity from relation", { feature, rel });
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
                            osm_type: "relation",
                            osm_id: rel.rel,
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

    protected abstract buildAndExecuteQuery(
        wd_keys: string[],
        bbox: BBox,
        osm_text_key: string | undefined,
        relation_member_role: string | undefined,
        use_wikidata: boolean,
        onlyCentroids: boolean,
        year: number
    ): Promise<OwmfResponse>;
}