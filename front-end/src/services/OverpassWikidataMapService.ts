import type { BBox, Feature, Geometry } from "geojson";
import type { MapDatabase } from "../db/MapDatabase";
import type { Etymology, OsmType, OsmWdJoinField } from "../model/Etymology";
import { getFeatureLinkedEntities, getFeatureTags, type OwmfResponse, type OwmfResponseFeatureProperties } from "../model/OwmfResponse";
import { SourcePreset } from "../model/SourcePreset";
import type { MapService } from "./MapService";

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

        console.debug("No cached response found, fetching from Overpass & Wikidata", { sourcePresetID: this.preset?.id, backEndID, onlyCentroids, bbox, language });
        const [overpassBackEndID, wikidataBackEndID] = backEndID.split("+");
        if (!overpassBackEndID || !wikidataBackEndID)
            throw new Error(`Invalid combined cluster back-end ID: "${backEndID}"`);

        let out: OwmfResponse;
        if (onlyCentroids && /^overpass_(osm|ohm)_wd$/.test(overpassBackEndID)) {
            // In the cluster view wikidata=* elements wouldn't be merged and would be duplicated
            out = await this.wikidataService.fetchMapElements(wikidataBackEndID, true, bbox, language, year);
        } else {
            // Fetch and merge the data from Overpass and Wikidata
            let actualOverpassBackEndID: string;
            if (onlyCentroids && overpassBackEndID === "overpass_osm_all_wd")
                actualOverpassBackEndID = "overpass_osm_all";
            else if (onlyCentroids && overpassBackEndID === "overpass_ohm_all_wd")
                actualOverpassBackEndID = "overpass_ohm_all";
            else
                actualOverpassBackEndID = overpassBackEndID;


            console.time("overpass_wikidata_fetch");
            const [overpassData, wikidataData] = await Promise.all([
                this.overpassService.fetchMapElements(actualOverpassBackEndID, onlyCentroids, bbox, language, year),
                this.wikidataService.fetchMapElements(wikidataBackEndID, onlyCentroids, bbox, language, year)
            ]);
            console.timeEnd("overpass_wikidata_fetch");

            console.time("overpass_wikidata_merge");
            out = this.mergeMapData(overpassData, wikidataData);
            console.timeEnd("overpass_wikidata_merge");

            if (!out)
                throw new Error("Merge failed");

            out.onlyCentroids = onlyCentroids;
            out.sourcePresetID = this.preset.id;
            out.backEndID = backEndID;
            out.language = language;
            out.year = year;

            if (!onlyCentroids) {
                out.features = out.features.filter((feature) => {
                    const noEtymologyRequired = wikidataBackEndID === "wd_base" && !!feature.properties?.wikidata?.length,
                        hasEtymology = !!feature.properties?.linked_entity_count || !!feature.properties?.text_etymology?.length;
                    return noEtymologyRequired || hasEtymology;
                });
                out.total_entity_count = out.features
                    .map(feature => feature.properties?.linked_entity_count ?? 0)
                    .reduce((acc: number, num: number) => acc + num, 0);
            }
        }

        console.debug(`Overpass+Wikidata fetchMapElements found ${out.features.length} features with ${out.total_entity_count} linked entities after filtering`, out);
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

            if (osmFeature.properties?.wikidata !== undefined && (
                osmFeature.properties.wikidata === wikidataFeature.properties?.wikidata ||
                osmFeature.properties.wikidata === wikidataFeature.properties?.wikidata_alias
            )) {
                getFeatureLinkedEntities(wikidataFeature)?.forEach(ety => {
                    if (osmFeature.properties?.from_osm_instance === "osm.org") {
                        ety.osm_wd_join_field = "OSM";
                        ety.from_osm_id = osmFeature.properties?.osm_id;
                        ety.from_osm_type = osmFeature.properties?.osm_type;
                    } else if (osmFeature.properties?.from_osm_instance === "openhistoricalmap.org") {
                        ety.osm_wd_join_field = "OHM";
                        ety.from_osm_id = osmFeature.properties?.ohm_id;
                        ety.from_osm_type = osmFeature.properties?.ohm_type;
                    } else {
                        console.warn("Overpass element not from OSM nor from OHM, likely an error", osmFeature.properties);
                    }
                });
                return true; // Same Wikidata => merge
            }

            if (osmFeature.properties?.osm_id !== undefined && osmFeature.properties?.osm_id === wikidataFeature.properties?.osm_id && osmFeature.properties?.osm_type !== undefined && osmFeature.properties?.osm_type === wikidataFeature.properties?.osm_type) {
                const join_field = JOIN_FIELD_MAP[wikidataFeature.properties.osm_type];
                getFeatureLinkedEntities(wikidataFeature)?.forEach(ety => { ety.osm_wd_join_field = join_field; });
                return true; // Same OSM => merge
            }

            return false; // Different feature => ignore
        });

        if (!osmFeaturesToMerge.length)
            osmFeatures.push(wikidataFeature); // No existing OSM feature to merge with => Add the standalone Wikidata feature

        osmFeaturesToMerge.forEach((osmFeature) => {
            osmFeature.id = osmFeature.id + "_" + wikidataFeature.id;

            if (!osmFeature.properties)
                osmFeature.properties = {};
            osmFeature.properties.from_wikidata = true;
            osmFeature.properties.from_wikidata_entity = wikidataFeature.properties?.from_wikidata_entity;
            osmFeature.properties.from_wikidata_prop = wikidataFeature.properties?.from_wikidata_prop;
            osmFeature.properties.wikispore ??= wikidataFeature.properties?.wikispore;

            // Unlike Overpass, Wikidata returns localized Wikipedia links so it has more priority
            if (wikidataFeature.properties?.wikipedia)
                osmFeature.properties.wikipedia = wikidataFeature.properties?.wikipedia;

            // OverpassService always fills render_height, giving priority to Wikidata
            if (wikidataFeature.properties?.render_height)
                osmFeature.properties.render_height = wikidataFeature.properties?.render_height;

            const osmI18n = getFeatureTags(osmFeature),
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
                osmI18n.alt_name = [osmI18n.alt_name, wdI18n.name].join(";");

            // For other key, give priority to Overpass
            if (!osmI18n.name && wdI18n.name)
                osmI18n.name = wdI18n.name;
            if (!osmI18n.description && wdI18n.description)
                osmI18n.description = wdI18n.description;
            if (!osmFeature.properties.picture && wikidataFeature.properties?.picture)
                osmFeature.properties.picture = wikidataFeature.properties?.picture;
            if (!osmFeature.properties.commons && wikidataFeature.properties?.commons)
                osmFeature.properties.commons = wikidataFeature.properties?.commons;
            if (!osmFeature.properties.wikidata && wikidataFeature.properties?.wikidata)
                osmFeature.properties.wikidata = wikidataFeature.properties?.wikidata;

            // Merge Wikidata feature linked entities into OSM feature linked entities
            getFeatureLinkedEntities(wikidataFeature)?.forEach((wdEtymology: Etymology) => {
                const osmEtymologies = getFeatureLinkedEntities(osmFeature) ?? [],
                    osmEtymologyIndex = osmEtymologies?.findIndex(osmEtymology => osmEtymology.wikidata === wdEtymology.wikidata);
                if (osmEtymologies && wdEtymology.wikidata && osmEtymologyIndex !== undefined && osmEtymologyIndex !== -1) {
                    // Wikidata etymology has priority over the Overpass one as it can have more details, like statementEntity
                    console.warn("Overpass+Wikidata: Duplicate etymology, using the Wikidata one", { id: wdEtymology.wikidata, osm: osmFeature.properties, wd: wikidataFeature.properties });
                    osmEtymologies[osmEtymologyIndex] = wdEtymology;
                } else {
                    osmEtymologies.push(wdEtymology);

                    if (!osmFeature.properties)
                        osmFeature.properties = {};
                    osmFeature.properties.linked_entities = osmEtymologies;
                    osmFeature.properties.linked_entity_count = osmEtymologies.length + (osmFeature.properties.text_etymology ? 1 : 0);
                }
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