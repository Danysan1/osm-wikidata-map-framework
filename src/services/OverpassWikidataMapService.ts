import { debug, getConfig } from "../config";
import { MapDatabase } from "../db/MapDatabase";
import { Etymology, EtymologyFeature, EtymologyResponse } from "../generated/owmf";
import { OverpassService } from "./OverpassService";
import { WikidataMapService } from "./WikidataMapService";
import { GeoJSON, BBox, Feature as GeoJSONFeature, Geometry, GeoJsonProperties } from "geojson";

type Feature = GeoJSONFeature<Geometry, GeoJsonProperties> & EtymologyFeature;

export class OverpassWikidataMapService {
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
            return this.wikidataService.fetchMapData(wikidataSourceID, bbox);

        const actualOverpassSourceID = overpassSourceID === "overpass_all_wd" ? "overpass_wd" : overpassSourceID;
        return await this.fetchAndMergeMapData(
            "elements-" + sourceID,
            () => this.overpassService.fetchMapClusterElements(actualOverpassSourceID, bbox),
            () => this.wikidataService.fetchMapData(wikidataSourceID, bbox),
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
            () => this.wikidataService.fetchMapData(wikidataSourceID, bbox),
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
        fetchOverpass: () => Promise<GeoJSON & EtymologyResponse>,
        fetchWikidata: () => Promise<GeoJSON & EtymologyResponse>,
        bbox: BBox
    ): Promise<GeoJSON & EtymologyResponse> {
        let out = await this.db.getMap(sourceID, bbox, this.language);
        if (out) {
            if (debug) console.debug("Overpass+Wikidata cache hit, using cached response", { sourceID, bbox, language: this.language, out });
        } else {
            if (debug) console.debug("Overpass+Wikidata cache miss, fetching data", { sourceID, bbox, language: this.language });
            if (debug) console.time("fetch");
            const [overpassData, wikidataData] = await Promise.all([fetchOverpass(), fetchWikidata()]);
            if (debug) { console.timeEnd("fetch"); console.time("merge"); }
            out = this.mergeMapData(overpassData, wikidataData);
            if (debug) console.timeEnd("merge");
            if (!out)
                throw new Error("Merge failed");
            out.sourceID = sourceID;
            this.db.addMap(out);
        }
        return out;
    }

    private mergeMapData(overpassData: GeoJSON & EtymologyResponse, wikidataData: GeoJSON & EtymologyResponse): GeoJSON & EtymologyResponse {
        const out = wikidataData.features.reduce((acc, wikidataFeature: Feature) => {
            const existingFeature: Feature | undefined = overpassData.features.find((overpassFeature: Feature) => {
                const sameWikidata = overpassFeature.properties?.wikidata !== undefined && overpassFeature.properties?.wikidata === wikidataFeature.properties?.wikidata,
                    //sameCommons = overpassFeature.properties?.commons !== undefined && overpassFeature.properties?.commons === wikidataFeature.properties?.commons,
                    sameOSM = overpassFeature.properties?.osm_id !== undefined && overpassFeature.properties?.osm_id === wikidataFeature.properties?.osm_id && overpassFeature.properties?.osm_type !== undefined && overpassFeature.properties?.osm_type === wikidataFeature.properties?.osm_type;
                return sameWikidata || sameOSM;
            });
            if (!existingFeature) {
                acc.features.push(wikidataFeature);
            } else {
                if (!existingFeature.properties)
                    existingFeature.properties = {};
                existingFeature.properties.from_wikidata = true;
                existingFeature.properties.from_wikidata_entity = wikidataFeature.properties?.from_wikidata_entity;
                existingFeature.properties.from_wikidata_prop = wikidataFeature.properties?.from_wikidata_prop;
                
                // Unlike Overpass, Wikidata returns localized Wikipedia links so it has more priority
                if (existingFeature.properties && wikidataFeature.properties?.wikipedia)
                    existingFeature.properties.wikipedia = wikidataFeature.properties?.wikipedia;

                if (!existingFeature.properties?.alt_name && existingFeature.properties?.name && wikidataFeature.properties?.name) {
                    const lowerOsmName = existingFeature.properties.name.toLowerCase(),
                        lowerWikidataName = wikidataFeature.properties.name.toLowerCase();
                    if (!lowerWikidataName.includes(lowerOsmName) && !lowerOsmName.includes(lowerWikidataName))
                        existingFeature.properties.alt_name = wikidataFeature.properties.name;
                }

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
                        const ety: Etymology = {
                            ...etymology,
                            from_osm_id: existingFeature.properties?.osm_id,
                            from_osm_type: existingFeature.properties?.osm_type
                        };
                        if (!existingFeature.properties)
                            existingFeature.properties = {};
                        if (!existingFeature.properties.etymologies)
                            existingFeature.properties.etymologies = [ety];
                        else
                            existingFeature.properties.etymologies.push(ety);
                    }
                });
            }
            return acc;
        }, overpassData);

        out.wikidata_query = wikidataData.wikidata_query;
        out.truncated = out.truncated || wikidataData.truncated;
        if (debug) console.debug(`Overpass+Wikidata mergeMapData found ${out.features.length} features`, { features: [...out.features] });
        return out;
    }
}