import type { BBox, Feature, Geometry } from "geojson";
import type { MapDatabase } from "../db/MapDatabase";
import { type LinkedEntity, type OsmType, type OsmWdJoinField } from "../model/LinkedEntity";
import { createFeatureTags, getFeatureLinkedEntities, getFeatureTags, type OwmfResponse, type OwmfResponseFeatureProperties } from "../model/OwmfResponse";
import type { SourcePreset } from "../model/SourcePreset";
import type { MapService } from "./MapService";
import { normalizeCommonsTitle } from "./WikimediaCommonsService";

const JOIN_FIELD_MAP: Record<OsmType, OsmWdJoinField> = {
    node: "P11693",
    way: "P10689",
    relation: "P402"
};

export class OverpassWikidataMapService implements MapService {
    private readonly preset: SourcePreset;
    private readonly db?: MapDatabase;
    private readonly overpassService: MapService;
    private readonly wikidataService: MapService;

    constructor(preset: SourcePreset, overpassService: MapService, wikidataService: MapService, db?: MapDatabase) {
        this.preset = preset;
        this.db = db;
        this.overpassService = overpassService;
        this.wikidataService = wikidataService;
    }

    public canHandleBackEnd(backEndID: string): boolean {
        const [overpassBackEndID, wikidataBackEndID] = backEndID.split("+");
        return this.overpassService.canHandleBackEnd(overpassBackEndID) && this.wikidataService.canHandleBackEnd(wikidataBackEndID);
    }

    public async fetchMapElements(backEndID: string, onlyCentroids: boolean, bbox: BBox, language: string, year: number) {
        const cachedResponse = await this.db?.getMap(this.preset.id, backEndID, onlyCentroids, bbox, language, year);
        if (cachedResponse)
            return cachedResponse;

        console.debug("Overpass+Wikidata: No cached response found, fetching from Overpass & Wikidata", { sourcePresetID: this.preset?.id, backEndID, onlyCentroids, bbox, language });
        const [overpassBackEndID, wikidataBackEndID] = backEndID.split("+");
        if (!overpassBackEndID || !wikidataBackEndID)
            throw new Error(`Invalid combined cluster back-end ID: "${backEndID}"`);

        let out: OwmfResponse;
        if (onlyCentroids && overpassBackEndID.endsWith("pass_osm_wd")) {
            // In the cluster view wikidata=* elements wouldn't be merged and would be duplicated
            out = await this.wikidataService.fetchMapElements(wikidataBackEndID, true, bbox, language, year);
        } else {
            // Fetch and merge the data from Overpass and Wikidata
            let actualOverpassBackEndID: string;
            if (onlyCentroids && overpassBackEndID.endsWith("pass_osm_all_wd"))
                actualOverpassBackEndID = overpassBackEndID.replace("_wd", "");
            else
                actualOverpassBackEndID = overpassBackEndID;


            console.time("overpass_wikidata_fetch");
            const [overpassResult, wikidataResult] = await Promise.allSettled([
                this.overpassService.fetchMapElements(actualOverpassBackEndID, onlyCentroids, bbox, language, year),
                this.wikidataService.fetchMapElements(wikidataBackEndID, onlyCentroids, bbox, language, year)
            ]);
            console.timeEnd("overpass_wikidata_fetch");

            let overpassData: OwmfResponse | undefined;
            if (overpassResult.status === "fulfilled") {
                overpassData = overpassResult.value;
            } else {
                console.error("OverpassWikidataMapService: Overpass query failed", overpassResult.reason);
                //out.error = `Overpass query failed: ${overpassResult.reason}`;
            }

            let wikidataData: OwmfResponse | undefined;
            if (wikidataResult.status === "fulfilled") {
                wikidataData = wikidataResult.value;
            } else {
                console.error("OverpassWikidataMapService: Wikidata query failed", wikidataResult.reason);
                //out.error = `Wikidata query failed: ${wikidataResult.reason}`;
            }

            if (overpassData && wikidataData) {
                console.time("overpass_wikidata_merge");
                out = this.mergeMapData(overpassData, wikidataData);
                overpassData.partial = false;
                console.timeEnd("overpass_wikidata_merge");
            } else if (overpassData) {
                out = overpassData;
                out.partial = true;
            } else if (wikidataData) {
                out = wikidataData;
                out.partial = true;
            } else {
                throw new Error(`Both Overpass and Wikidata queries failed: ${overpassResult.status === "rejected" ? overpassResult.reason : ""} ${wikidataResult.status === "rejected" ? wikidataResult.reason : ""}`);
            }

            out.onlyCentroids = onlyCentroids;
            out.sourcePresetID = this.preset.id;
            out.backEndID = backEndID;
            out.language = language;
            out.year = year;

            if (!onlyCentroids) {
                out.features = out.features.filter((feature) => {
                    if (feature.properties?.linked_entity_count)
                        return true; // Has some linked entities => keep

                    if (!!this.preset.osm_wikidata_keys?.length || !!this.preset.osm_text_key)
                        return false; // Preset requires linked entities but feature has none => Discard

                    if (feature.properties?.wikidata)
                        return true; // Feature has a Wikidata entity and preset does not require linked entities => Keep

                    return process.env.NEXT_PUBLIC_OWMF_require_wikidata_link !== "true" && !!this.preset.osm_filter_tags?.length;
                });
                out.total_entity_count = out.features
                    .map(feature => feature.properties?.linked_entity_count ?? 0)
                    .reduce((acc: number, num: number) => acc + num, 0);
            }
        }

        console.debug(`Overpass+Wikidata fetchMapElements found ${out.features.length} features with ${out.total_entity_count} linked entities after filtering`);
        void this.db?.addMap(out);
        return out;
    }

    private mergeWikidataFeature(
        wikidataFeature: Feature<Geometry, OwmfResponseFeatureProperties>,
        osmFeatures: Feature<Geometry, OwmfResponseFeatureProperties>[]
    ) {
        const osmFeaturesToMerge = osmFeatures.filter((osmFeature) => {
            if (osmFeature.properties?.from_wikidata === true)
                return false; // Already merged with another Wikidata feature => ignore

            let wikidataMatchOsmType: OsmType | undefined,
                wikidataMatchOsmId: number | undefined;
            if (osmFeature.properties?.wikidata !== undefined && (
                osmFeature.properties.wikidata === wikidataFeature.properties?.wikidata ||
                osmFeature.properties.wikidata === wikidataFeature.properties?.wikidata_alias
            )) {
                // The OSM feature itself is represented by this Wikidata entity
                wikidataMatchOsmType = osmFeature.properties?.osm_type;
                wikidataMatchOsmId = osmFeature.properties?.osm_id;
            } else {
                // Search whether any relation containing this OSM feature is represented by this Wikidata entity
                wikidataMatchOsmId = osmFeature.properties?.relations?.find(rel =>
                    rel.reltags.wikidata !== undefined && (
                        rel.reltags.wikidata === wikidataFeature.properties?.wikidata ||
                        rel.reltags.wikidata === wikidataFeature.properties?.wikidata_alias
                    ))?.rel;
                wikidataMatchOsmType = wikidataMatchOsmId ? "relation" : undefined;
            }

            if (wikidataMatchOsmId && wikidataMatchOsmType) {
                getFeatureLinkedEntities(wikidataFeature)?.forEach(ety => {
                    ety.osm_wd_join_field = "OSM";
                    ety.from_osm_id = wikidataMatchOsmId;
                    ety.from_osm_type = wikidataMatchOsmType;
                });
                return true; // Same Wikidata => merge
            }

            const osmID = osmFeature.properties?.osm_id,
                osmType = osmFeature.properties?.osm_type,
                wdOsmID = wikidataFeature.properties?.osm_id,
                wdOsmType = wikidataFeature.properties?.osm_type;
            if (osmID && osmID === wdOsmID && osmType && osmType === wdOsmType) {
                const join_field = JOIN_FIELD_MAP[osmType];
                console.debug("Overpass+Wikidata: Setting osm_wd_join_field", { osmType, osmID, join_field });
                getFeatureLinkedEntities(wikidataFeature)?.forEach(ety => { ety.osm_wd_join_field = join_field; });
                return true; // Same OSM => merge
            }

            return false; // Different feature => ignore
        });

        if (!osmFeaturesToMerge.length)
            osmFeatures.push(wikidataFeature); // No existing OSM feature to merge with => Add the standalone Wikidata feature

        osmFeaturesToMerge.forEach((osmFeature) => {
            osmFeature.id = (osmFeature.id ?? osmFeature.properties?.id) + "_" + (wikidataFeature.id ?? wikidataFeature.properties?.id);

            osmFeature.properties ??= {};
            osmFeature.properties.id = osmFeature.id; // Copying the ID as sometimes Maplibre erases feature.id
            osmFeature.properties.from_wikidata = true;
            osmFeature.properties.from_wikidata_entity = wikidataFeature.properties?.from_wikidata_entity;
            osmFeature.properties.from_wikidata_prop = wikidataFeature.properties?.from_wikidata_prop;

            // Unlike Overpass, Wikidata returns localized Wikipedia links so it has more priority
            if (wikidataFeature.properties?.wikipedia)
                osmFeature.properties.wikipedia = wikidataFeature.properties?.wikipedia;

            // OverpassService always fills render_height, giving priority to Wikidata
            if (wikidataFeature.properties?.render_height)
                osmFeature.properties.render_height = wikidataFeature.properties?.render_height;

            const osmI18n = createFeatureTags(osmFeature),
                wdI18n = getFeatureTags(wikidataFeature),
                lowerOsmName = osmI18n?.name?.toLowerCase(),
                lowerOsmAltName = osmI18n?.alt_name?.toLowerCase(),
                lowerWikidataName = wdI18n?.name?.toLowerCase();
            if (!osmI18n.name && wdI18n?.name) // If OSM has no name but Wikidata has a name, use it as name
                osmI18n.name = wdI18n.name;
            else if (!osmI18n.alt_name && wdI18n?.name) // If OSM has no alt_name but Wikidata has a name, use it as alt_name
                osmI18n.alt_name = wdI18n.name;
            else if (lowerOsmName &&
                lowerOsmAltName &&
                lowerWikidataName &&
                !lowerWikidataName.includes(lowerOsmName) &&
                !lowerOsmName.includes(lowerWikidataName) &&
                !lowerWikidataName.includes(lowerOsmAltName) &&
                !lowerOsmAltName.includes(lowerWikidataName)) // If OSM has a name and an alt_name and Wikidata has a different name, append it to alt_name
                osmI18n.alt_name = [osmI18n.alt_name, wdI18n?.name].join(";");

            // For other key, give priority to Overpass
            osmI18n.description ??= wdI18n?.description;
            osmFeature.properties.picture ??= wikidataFeature.properties?.picture;
            osmFeature.properties.iiif_url ??= wikidataFeature.properties?.iiif_url;
            osmFeature.properties.commons ??= wikidataFeature.properties?.commons;
            osmFeature.properties.wikidata ??= wikidataFeature.properties?.wikidata;
            osmFeature.properties.osm_id ??= wikidataFeature.properties?.osm_id;
            osmFeature.properties.osm_type ??= wikidataFeature.properties?.osm_type;
            osmFeature.properties.render_height ??= wikidataFeature.properties?.render_height;
            osmFeature.properties.wikidata_alias ??= wikidataFeature.properties?.wikidata_alias;
            osmFeature.properties.wikispore ??= wikidataFeature.properties?.wikispore;

            // Merge Wikidata feature linked entities into OSM feature linked entities
            getFeatureLinkedEntities(wikidataFeature)?.forEach((wdEntity: LinkedEntity) => {
                const osmEntities = getFeatureLinkedEntities(osmFeature) ?? [],
                    osmEntityIndex = osmEntities?.findIndex(osmEntity => osmEntity.wikidata === wdEntity.wikidata);
                if (osmEntities && wdEntity.wikidata && osmEntityIndex !== undefined && osmEntityIndex !== -1) {
                    // Wikidata linked entity has priority over the Overpass one as it can have more details
                    console.warn("Overpass+Wikidata: Duplicate linked entity, using the Wikidata one", { id: wdEntity.wikidata, osm: osmEntities[osmEntityIndex], wd: wdEntity });
                    osmEntities[osmEntityIndex] = wdEntity;
                } else {
                    //console.debug("Overpass+Wikidata: Pushing Wikidata linked entity", wdEtymology);
                    osmEntities.push(wdEntity);

                    osmFeature.properties ??= {};
                    osmFeature.properties.linked_entities = osmEntities.length ? osmEntities : undefined;
                    osmFeature.properties.linked_entity_count = osmEntities.length;
                }

                if (osmFeature.properties?.picture && wdEntity.linkPicture && normalizeCommonsTitle(osmFeature.properties.picture) === normalizeCommonsTitle(wdEntity.linkPicture))
                    wdEntity.linkPicture = undefined; // Prevent duplicating the picture both in the feature and the linked entity
            });
        });

        return osmFeatures;
    }

    private mergeMapData(overpassData: OwmfResponse, wikidataData: OwmfResponse): OwmfResponse {
        wikidataData.features.forEach(feature => this.mergeWikidataFeature(feature, overpassData.features));
        overpassData.wdqs_query = wikidataData.wdqs_query;
        overpassData.truncated = !!overpassData.truncated || !!wikidataData.truncated;
        console.debug(
            "Overpass+Wikidata mergeMapData merged features", overpassData.features
        );
        return overpassData;
    }
}