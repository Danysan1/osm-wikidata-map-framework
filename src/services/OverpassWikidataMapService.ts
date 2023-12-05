import { debug, getConfig } from "../config";
import { MapDatabase } from "../db/MapDatabase";
import { Etymology, EtymologyFeature, EtymologyFeaturePropertiesOsmTypeEnum, EtymologyOsmWdJoinFieldEnum, EtymologyResponse } from "../generated/owmf";
import { MapService } from "./MapService";
import { OverpassService } from "./OverpassService";
import { WikidataMapService } from "./WikidataMapService";
import { GeoJSON, BBox, Feature as GeoJSONFeature, Geometry, GeoJsonProperties } from "geojson";

type FeatureCollection = GeoJSON & EtymologyResponse;
type Feature = GeoJSONFeature<Geometry, GeoJsonProperties> & EtymologyFeature;

const JOIN_FIELD_MAP: Record<EtymologyFeaturePropertiesOsmTypeEnum, EtymologyOsmWdJoinFieldEnum> = {
    node: "P11693",
    way: "P10689",
    relation: "P402"
};

export class OverpassWikidataMapService implements MapService {
    private db: MapDatabase;
    private language: string;
    private overpassService: OverpassService;
    private wikidataService: WikidataMapService;

    constructor(overpassService: OverpassService, wikidataService: WikidataMapService, db: MapDatabase) {
        this.db = db;
        this.language = document.documentElement.lang.split('-').at(0) || getConfig("default_language") || "en";
        this.overpassService = overpassService;
        this.wikidataService = wikidataService;
    }

    canHandleSource(sourceID: string): boolean {
        const [overpassSourceID, wikidataSourceID] = sourceID.split("+");
        return this.overpassService.canHandleSource(overpassSourceID) && this.wikidataService.canHandleSource(wikidataSourceID);
    }

    async fetchMapClusterElements(sourceID: string, bbox: BBox) {
        const [overpassSourceID, wikidataSourceID] = sourceID.split("+");
        if (!overpassSourceID || !wikidataSourceID)
            throw new Error("Invalid sourceID");

        if (overpassSourceID === "overpass_wd")  // In the cluster view wikidata=* elements wouldn't be merged and would be duplicated
            return this.wikidataService.fetchMapClusterElements(wikidataSourceID, bbox);

        const actualOverpassSourceID = overpassSourceID === "overpass_all_wd" ? "overpass_all" : overpassSourceID;
        return await this.fetchAndMergeMapData(
            "elements-" + sourceID,
            () => this.overpassService.fetchMapClusterElements(actualOverpassSourceID, bbox),
            () => this.wikidataService.fetchMapClusterElements(wikidataSourceID, bbox),
            bbox
        );
    }

    async fetchMapElementDetails(sourceID: string, bbox: BBox) {
        const [overpassSourceID, wikidataSourceID] = sourceID.split("+");
        if (!overpassSourceID || !wikidataSourceID)
            throw new Error("Invalid sourceID");

        const out = await this.fetchAndMergeMapData(
            "details-" + sourceID,
            () => this.overpassService.fetchMapElementDetails(overpassSourceID, bbox),
            () => this.wikidataService.fetchMapElementDetails(wikidataSourceID, bbox),
            bbox
        );
        out.features = out.features.filter(
            (feature: Feature) => wikidataSourceID === "wd_base" ? feature.properties?.wikidata : (feature.properties?.etymologies?.length || feature.properties?.text_etymology)
        );
        out.etymology_count = out.features.reduce(
            (acc, feature) => acc + (feature.properties?.etymologies?.length || 0),
            0
        );
        if (debug) console.debug(`Overpass+Wikidata fetchMapElementDetails found ${out.features.length} features with ${out.etymology_count} etymologies after filtering`, out);
        return out;
    }

    private async fetchAndMergeMapData(
        sourceID: string,
        fetchOverpass: () => Promise<FeatureCollection>,
        fetchWikidata: () => Promise<FeatureCollection>,
        bbox: BBox
    ): Promise<FeatureCollection> {
        let out = await this.db.getMap(sourceID, bbox, this.language);
        if (out) {
            if (debug) console.debug("Overpass+Wikidata cache hit, using cached response", { sourceID, bbox, language: this.language, out });
        } else {
            if (debug) console.debug("Overpass+Wikidata cache miss, fetching data", { sourceID, bbox, language: this.language });

            if (debug) console.time("Overpass+Wikidata fetch");
            const [overpassData, wikidataData] = await Promise.all([fetchOverpass(), fetchWikidata()]);
            if (debug) console.timeEnd("Overpass+Wikidata fetch");

            if (debug) console.time("Overpass+Wikidata merge");
            out = this.mergeMapData(overpassData, wikidataData);
            if (debug) console.timeEnd("Overpass+Wikidata merge");

            if (!out)
                throw new Error("Merge failed");
            out.sourceID = sourceID;
            this.db.addMap(out);
        }
        return out;
    }

    private mergeMapData(overpassData: FeatureCollection, wikidataData: FeatureCollection): FeatureCollection {
        const out = wikidataData.features.reduce((acc, wikidataFeature: Feature) => {
            const existingFeaturesToMerge = acc.features.filter((overpassFeature: Feature) => {
                if (overpassFeature.properties?.from_wikidata === true)
                    return false; // Already merged with another Wikidata feature => ignore

                if (overpassFeature.properties?.wikidata !== undefined && (
                    overpassFeature.properties.wikidata === wikidataFeature.properties?.wikidata ||
                    overpassFeature.properties.wikidata === wikidataFeature.properties?.wikidata_alias
                )) {
                    wikidataFeature.properties.etymologies?.forEach(ety => {
                        ety.osm_wd_join_field = "OSM";
                        ety.from_osm_id = overpassFeature.properties?.osm_id;
                        ety.from_osm_type = overpassFeature.properties?.osm_type;
                    });
                    return true; // Same Wikidata => merge
                }

                if (overpassFeature.properties?.osm_id !== undefined && overpassFeature.properties?.osm_id === wikidataFeature.properties?.osm_id && overpassFeature.properties?.osm_type !== undefined && overpassFeature.properties?.osm_type === wikidataFeature.properties?.osm_type) {
                    const join_field = JOIN_FIELD_MAP[wikidataFeature.properties.osm_type];
                    wikidataFeature.properties.etymologies?.forEach(ety => { ety.osm_wd_join_field = join_field; });
                    return true; // Same OSM => merge
                }

                return false; // Different feature => ignore
            });

            if (!existingFeaturesToMerge.length)
                acc.features.push(wikidataFeature); // No existing OSM feature to merge with => Add the standalone Wikidata feature

            existingFeaturesToMerge.forEach((existingFeature: Feature) => {
                if (!existingFeature.properties)
                    existingFeature.properties = {};
                existingFeature.properties.from_wikidata = true;
                existingFeature.properties.from_wikidata_entity = wikidataFeature.properties?.from_wikidata_entity;
                existingFeature.properties.from_wikidata_prop = wikidataFeature.properties?.from_wikidata_prop;

                // Unlike Overpass, Wikidata returns localized Wikipedia links so it has more priority
                if (existingFeature.properties && wikidataFeature.properties?.wikipedia)
                    existingFeature.properties.wikipedia = wikidataFeature.properties?.wikipedia;

                const lowerOsmName = existingFeature.properties.name?.toLowerCase(),
                    lowerOsmAltName = existingFeature.properties.alt_name?.toLowerCase(),
                    lowerWikidataName = wikidataFeature.properties?.name?.toLowerCase();
                if (!lowerOsmName && lowerWikidataName) // If OSM has no name but Wikidata has a name, use it as name
                    existingFeature.properties.name = wikidataFeature.properties?.name;
                else if (!lowerOsmAltName && lowerWikidataName) // If OSM has no alt_name but Wikidata has a name, use it as alt_name
                    existingFeature.properties.alt_name = wikidataFeature.properties?.name;
                else if (lowerOsmName &&
                    lowerOsmAltName &&
                    lowerWikidataName &&
                    !lowerWikidataName.includes(lowerOsmName) &&
                    !lowerOsmName.includes(lowerWikidataName) &&
                    !lowerWikidataName.includes(lowerOsmAltName) &&
                    !lowerOsmAltName.includes(lowerWikidataName)) // If OSM has a name and an alt_name and Wikidata has a different name, append it to alt_name
                    existingFeature.properties.alt_name = [existingFeature.properties.alt_name, wikidataFeature.properties?.name].join(";");

                // For other key, give priority to Overpass
                ["name", "description", "picture", "commons", "wikidata"].forEach(key => {
                    if (existingFeature.properties && !existingFeature.properties[key]) {
                        const fallbackValue = wikidataFeature.properties?.[key];
                        if (typeof fallbackValue === "string")
                            existingFeature.properties[key] = fallbackValue;
                    }
                });

                // Merge etymologies
                wikidataFeature.properties?.etymologies?.forEach((etymology: Etymology) => {
                    if (etymology.wikidata && existingFeature.properties?.etymologies?.some(ety => ety.wikidata === etymology.wikidata)) {
                        if (debug) console.warn("Overpass+Wikidata: Ignoring duplicate etymology", { wd_id: etymology.wikidata, existing: existingFeature.properties, new: wikidataFeature.properties });
                    } else {
                        if (!existingFeature.properties)
                            existingFeature.properties = {};
                        if (!existingFeature.properties.etymologies)
                            existingFeature.properties.etymologies = [etymology];
                        else
                            existingFeature.properties.etymologies.push(etymology);
                    }
                });
            });

            return acc;
        }, overpassData);

        out.wdqs_query = wikidataData.wdqs_query;
        out.truncated = out.truncated || wikidataData.truncated;
        if (debug) console.debug(`Overpass+Wikidata mergeMapData found ${out.features.length} features`, { features: [...out.features] });
        return out;
    }
}