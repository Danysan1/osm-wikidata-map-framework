import type { EtymologyResponse, EtymologyResponseFeatureProperties } from "../model/EtymologyResponse";
import type { Etymology, OsmType, OsmWdJoinField } from "../model/Etymology";
import type { MapService } from "./MapService";
import type { BBox, Geometry, Feature } from "geojson";
import { getEtymologies } from "./etymologyUtils";
import type { MapDatabase } from "../db/MapDatabase";
import { EtymologyFeatureProperties } from "../model/EtymologyFeatureProperties";

const JOIN_FIELD_MAP: Record<OsmType, OsmWdJoinField> = {
    node: "P11693",
    way: "P10689",
    relation: "P402"
};

export class OverpassWikidataMapService implements MapService {
    private readonly db?: MapDatabase;
    private readonly overpassService: MapService;
    private readonly wikidataService: MapService;

    constructor(overpassService: MapService, wikidataService: MapService, db?: MapDatabase) {
        this.db = db;
        this.overpassService = overpassService;
        this.wikidataService = wikidataService;
    }

    public canHandleBackEnd(backEndID: string): boolean {
        const [overpassBackEndID, wikidataBackEndID] = backEndID.split("+");
        return this.overpassService.canHandleBackEnd(overpassBackEndID) && this.wikidataService.canHandleBackEnd(wikidataBackEndID);
    }

    public async fetchMapElements(backEndID: string, onlyCentroids: boolean, bbox: BBox, language: string) {
        const cachedResponse = await this.db?.getMap(backEndID, onlyCentroids, bbox, language);
        if (cachedResponse)
            return cachedResponse;

        const [overpassBackEndID, wikidataBackEndID] = backEndID.split("+");
        if (!overpassBackEndID || !wikidataBackEndID)
            throw new Error(`Invalid combined cluster back-end ID: "${backEndID}"`);

        if (onlyCentroids && overpassBackEndID === "overpass_wd")  // In the cluster view wikidata=* elements wouldn't be merged and would be duplicated
            return this.wikidataService.fetchMapElements(wikidataBackEndID, true, bbox, language);


        const actualOverpassBackEndID = (onlyCentroids && overpassBackEndID === "overpass_all_wd") ? "overpass_all" : overpassBackEndID;

        if (process.env.NODE_ENV === 'development') console.time("overpass_wikidata_fetch");
        const [overpassData, wikidataData] = await Promise.all([
            this.overpassService.fetchMapElements(actualOverpassBackEndID, onlyCentroids, bbox, language),
            this.wikidataService.fetchMapElements(wikidataBackEndID, onlyCentroids, bbox, language)
        ]);
        if (process.env.NODE_ENV === 'development') console.timeEnd("overpass_wikidata_fetch");

        if (process.env.NODE_ENV === 'development') console.time("overpass_wikidata_merge");
        const out: EtymologyResponse = this.mergeMapData(overpassData, wikidataData);
        if (process.env.NODE_ENV === 'development') console.timeEnd("overpass_wikidata_merge");

        if (!out)
            throw new Error("Merge failed");

        out.onlyCentroids = onlyCentroids;
        out.backEndID = backEndID;

        if (!onlyCentroids) {
            out.features = out.features.filter((feature) => {
                const noEtymologyRequired = wikidataBackEndID === "wd_base" && !!feature.properties?.wikidata?.length,
                    hasEtymology = !!feature.properties?.etymologies?.length || !!feature.properties?.text_etymology?.length;
                return noEtymologyRequired || hasEtymology;
            });
            out.etymology_count = out.features.map(feature => feature.properties?.etymologies?.length ?? 0)
                .reduce((acc: number, num: number) => acc + num, 0);
        }

        if (process.env.NODE_ENV === 'development') console.debug(`Overpass+Wikidata fetchMapElements found ${out.features.length} features with ${out.etymology_count} etymologies after filtering`, out);
        void this.db?.addMap(out);
        return out;
    }

    private mergeWikidataFeature(
        wikidataFeature: Feature<Geometry, EtymologyResponseFeatureProperties>,
        osmFeatures: Feature<Geometry, EtymologyResponseFeatureProperties>[]
    ) {
        const osmFeaturesToMerge = osmFeatures.filter((osmFeature) => {
            if (osmFeature.properties?.from_wikidata === true)
                return false; // Already merged with another Wikidata feature => ignore

            if (osmFeature.properties?.wikidata !== undefined && (
                osmFeature.properties.wikidata === wikidataFeature.properties?.wikidata ||
                osmFeature.properties.wikidata === wikidataFeature.properties?.wikidata_alias
            )) {
                getEtymologies(wikidataFeature)?.forEach(ety => {
                    ety.osm_wd_join_field = "OSM";
                    ety.from_osm_id = osmFeature.properties?.osm_id;
                    ety.from_osm_type = osmFeature.properties?.osm_type;
                });
                return true; // Same Wikidata => merge
            }

            if (osmFeature.properties?.osm_id !== undefined && osmFeature.properties?.osm_id === wikidataFeature.properties?.osm_id && osmFeature.properties?.osm_type !== undefined && osmFeature.properties?.osm_type === wikidataFeature.properties?.osm_type) {
                const join_field = JOIN_FIELD_MAP[wikidataFeature.properties.osm_type];
                getEtymologies(wikidataFeature)?.forEach(ety => { ety.osm_wd_join_field = join_field; });
                return true; // Same OSM => merge
            }

            return false; // Different feature => ignore
        });

        if (!osmFeaturesToMerge.length)
            osmFeatures.push(wikidataFeature); // No existing OSM feature to merge with => Add the standalone Wikidata feature

        osmFeaturesToMerge.forEach((osmFeature) => {
            if (!osmFeature.properties)
                osmFeature.properties = {};
            osmFeature.properties.from_wikidata = true;
            osmFeature.properties.from_wikidata_entity = wikidataFeature.properties?.from_wikidata_entity;
            osmFeature.properties.from_wikidata_prop = wikidataFeature.properties?.from_wikidata_prop;

            // Unlike Overpass, Wikidata returns localized Wikipedia links so it has more priority
            if (wikidataFeature.properties?.wikipedia)
                osmFeature.properties.wikipedia = wikidataFeature.properties?.wikipedia;

            // OverpassService always fills render_height, giving priority to Wikidata
            if (wikidataFeature.properties?.render_height)
                osmFeature.properties.render_height = wikidataFeature.properties?.render_height;

            const lowerOsmName = osmFeature.properties.name?.toLowerCase(),
                lowerOsmAltName = osmFeature.properties.alt_name?.toLowerCase(),
                lowerWikidataName = wikidataFeature.properties?.name?.toLowerCase();
            if (!lowerOsmName && lowerWikidataName) // If OSM has no name but Wikidata has a name, use it as name
                osmFeature.properties.name = wikidataFeature.properties?.name;
            else if (!lowerOsmAltName && lowerWikidataName) // If OSM has no alt_name but Wikidata has a name, use it as alt_name
                osmFeature.properties.alt_name = wikidataFeature.properties?.name;
            else if (lowerOsmName &&
                lowerOsmAltName &&
                lowerWikidataName &&
                !lowerWikidataName.includes(lowerOsmName) &&
                !lowerOsmName.includes(lowerWikidataName) &&
                !lowerWikidataName.includes(lowerOsmAltName) &&
                !lowerOsmAltName.includes(lowerWikidataName)) // If OSM has a name and an alt_name and Wikidata has a different name, append it to alt_name
                osmFeature.properties.alt_name = [osmFeature.properties.alt_name, wikidataFeature.properties?.name].join(";");

            // For other key, give priority to Overpass
            const KEYS_TO_MERGE: (keyof EtymologyFeatureProperties)[] = [
                "name", "description", "picture", "commons", "wikidata"
            ];
            KEYS_TO_MERGE.forEach(key => {
                if (osmFeature.properties && !osmFeature.properties[key]) {
                    const fallbackValue = wikidataFeature.properties?.[key];
                    if (typeof fallbackValue === "string")
                        osmFeature.properties[key] = fallbackValue;
                }
            });

            // Merge etymologies
            getEtymologies(wikidataFeature)?.forEach((wdEtymology: Etymology) => {
                const osmEtymologies = getEtymologies(osmFeature),
                    osmEtymologyIndex = osmEtymologies?.findIndex(osmEtymology => osmEtymology.wikidata === wdEtymology.wikidata);
                if (osmEtymologies && wdEtymology.wikidata && osmEtymologyIndex !== undefined && osmEtymologyIndex !== -1) {
                    // Wikidata etymology has priority over the Overpass one as it can have more details, like statementEntity
                    if (process.env.NODE_ENV === 'development') console.warn("Overpass+Wikidata: Duplicate etymology, using the Wikidata one", { id: wdEtymology.wikidata, osm: osmFeature.properties, wd: wikidataFeature.properties });
                    osmEtymologies[osmEtymologyIndex] = wdEtymology;
                } else {
                    if (!osmFeature.properties)
                        osmFeature.properties = {};
                    if (!osmFeature.properties.etymologies)
                        osmFeature.properties.etymologies = [wdEtymology];
                    else
                        osmEtymologies?.push(wdEtymology);
                }
            });
        });

        return osmFeatures;
    }

    private mergeMapData(overpassData: EtymologyResponse, wikidataData: EtymologyResponse): EtymologyResponse {
        wikidataData.features.forEach(feature => this.mergeWikidataFeature(feature, overpassData.features));
        overpassData.wdqs_query = wikidataData.wdqs_query;
        overpassData.truncated = !!overpassData.truncated || !!wikidataData.truncated;
        if (process.env.NODE_ENV === 'development') {
            console.debug(`Overpass+Wikidata mergeMapData found ${overpassData.features.length} features`);
            console.table(overpassData.features);
        }
        return overpassData;
    }
}