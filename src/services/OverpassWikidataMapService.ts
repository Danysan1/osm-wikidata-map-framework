import { getConfig } from "../config";
import { MapDatabase } from "../db/MapDatabase";
import type { EtymologyResponse } from "../model/EtymologyResponse";
import type { OsmType } from "../model/EtymologyFeatureProperties";
import type { Etymology, EtymologyOsmWdJoinFieldEnum } from "../model/Etymology";
import type { MapService } from "./MapService";
import { OverpassService } from "./OverpassService";
import { WikidataMapService } from "./WikidataMapService";
import type { BBox } from "geojson";

const JOIN_FIELD_MAP: Record<OsmType, EtymologyOsmWdJoinFieldEnum> = {
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

    canHandleBackEnd(backEndID: string): boolean {
        const [overpassBackEndID, wikidataBackEndID] = backEndID.split("+");
        return this.overpassService.canHandleBackEnd(overpassBackEndID) && this.wikidataService.canHandleBackEnd(wikidataBackEndID);
    }

    async fetchMapClusterElements(backEndID: string, bbox: BBox) {
        const [overpassBackEndID, wikidataBackEndID] = backEndID.split("+");
        if (!overpassBackEndID || !wikidataBackEndID)
            throw new Error(`Invalid combined cluster back-end ID: "${backEndID}"`);

        if (overpassBackEndID === "overpass_wd")  // In the cluster view wikidata=* elements wouldn't be merged and would be duplicated
            return this.wikidataService.fetchMapClusterElements(wikidataBackEndID, bbox);

        const actualOverpassBackEndID = overpassBackEndID === "overpass_all_wd" ? "overpass_all" : overpassBackEndID;
        return await this.fetchAndMergeMapData(
            "elements-" + backEndID,
            () => this.overpassService.fetchMapClusterElements(actualOverpassBackEndID, bbox),
            () => this.wikidataService.fetchMapClusterElements(wikidataBackEndID, bbox),
            bbox
        );
    }

    async fetchMapElementDetails(backEndID: string, bbox: BBox) {
        const [overpassBackEndID, wikidataBackEndID] = backEndID.split("+");
        if (!overpassBackEndID || !wikidataBackEndID)
            throw new Error(`Invalid combined details back-end ID: "${backEndID}"`);

        const out: EtymologyResponse = await this.fetchAndMergeMapData(
            "details-" + backEndID,
            () => this.overpassService.fetchMapElementDetails(overpassBackEndID, bbox),
            () => this.wikidataService.fetchMapElementDetails(wikidataBackEndID, bbox),
            bbox
        );
        out.features = out.features.filter(
            (feature) => wikidataBackEndID === "wd_base" ? feature.properties?.wikidata : (feature.properties?.etymologies?.length || feature.properties?.text_etymology)
        );
        out.etymology_count = out.features.map(feature => feature.properties?.etymologies?.length || 0)
            .reduce((acc: number, num: number) => acc + num, 0);
        if (process.env.NODE_ENV === 'development') console.debug(`Overpass+Wikidata fetchMapElementDetails found ${out.features.length} features with ${out.etymology_count} etymologies after filtering`, out);
        return out;
    }

    private async fetchAndMergeMapData(
        backEndID: string,
        fetchOverpass: () => Promise<EtymologyResponse>,
        fetchWikidata: () => Promise<EtymologyResponse>,
        bbox: BBox
    ): Promise<EtymologyResponse> {
        let out = await this.db.getMap(backEndID, bbox, this.language);
        if (out) {
            if (process.env.NODE_ENV === 'development') console.debug("Overpass+Wikidata cache hit, using cached response", { backEndID, bbox, language: this.language, out });
        } else {
            if (process.env.NODE_ENV === 'development') console.debug("Overpass+Wikidata cache miss, fetching data", { backEndID, bbox, language: this.language });

            if (process.env.NODE_ENV === 'development') console.time("Overpass+Wikidata fetch");
            const [overpassData, wikidataData] = await Promise.all([fetchOverpass(), fetchWikidata()]);
            if (process.env.NODE_ENV === 'development') console.timeEnd("Overpass+Wikidata fetch");

            if (process.env.NODE_ENV === 'development') console.time("Overpass+Wikidata merge");
            out = this.mergeMapData(overpassData, wikidataData);
            if (process.env.NODE_ENV === 'development') console.timeEnd("Overpass+Wikidata merge");

            if (!out)
                throw new Error("Merge failed");
            out.backEndID = backEndID;
            this.db.addMap(out);
        }
        return out;
    }

    private mergeMapData(overpassData: EtymologyResponse, wikidataData: EtymologyResponse): EtymologyResponse {
        const out = wikidataData.features.reduce((acc, wikidataFeature) => {
            const existingFeaturesToMerge = acc.features.filter((overpassFeature) => {
                if (overpassFeature.properties?.from_wikidata === true)
                    return false; // Already merged with another Wikidata feature => ignore

                if (overpassFeature.properties?.wikidata !== undefined && (
                    overpassFeature.properties.wikidata === wikidataFeature.properties?.wikidata ||
                    overpassFeature.properties.wikidata === wikidataFeature.properties?.wikidata_alias
                )) {
                    wikidataFeature.properties?.etymologies?.forEach(ety => {
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

            existingFeaturesToMerge.forEach((existingFeature) => {
                if (!existingFeature.properties)
                    existingFeature.properties = {};
                existingFeature.properties.from_wikidata = true;
                existingFeature.properties.from_wikidata_entity = wikidataFeature.properties?.from_wikidata_entity;
                existingFeature.properties.from_wikidata_prop = wikidataFeature.properties?.from_wikidata_prop;

                // Unlike Overpass, Wikidata returns localized Wikipedia links so it has more priority
                if (wikidataFeature.properties?.wikipedia)
                    existingFeature.properties.wikipedia = wikidataFeature.properties?.wikipedia;

                // OverpassService always fills render_height, giving priority to Wikidata
                if (wikidataFeature.properties?.render_height)
                    existingFeature.properties.render_height = wikidataFeature.properties?.render_height;

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
                        if (process.env.NODE_ENV === 'development') console.warn("Overpass+Wikidata: Ignoring duplicate etymology", { wd_id: etymology.wikidata, existing: existingFeature.properties, new: wikidataFeature.properties });
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
        if (process.env.NODE_ENV === 'development') console.debug(`Overpass+Wikidata mergeMapData found ${out.features.length} features`, { features: [...out.features] });
        return out;
    }
}