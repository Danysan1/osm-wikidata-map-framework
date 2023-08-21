import { Etymology, EtymologyFeature, EtymologyResponse } from "../generated/owmf";
import { OverpassService } from "./OverpassService";
import { WikidataMapService } from "./WikidataMapService";
import { GeoJSON, BBox, Feature as GeoJSONFeature, Geometry, GeoJsonProperties } from "geojson";

type Feature = GeoJSONFeature<Geometry, GeoJsonProperties> & EtymologyFeature;

export class OverpassWikidataMapService {
    private overpassService: OverpassService;
    private wikidataService: WikidataMapService;

    constructor(overpassService: OverpassService, wikidataService: WikidataMapService) {
        this.overpassService = overpassService;
        this.wikidataService = wikidataService;
    }

    canHandleSource(sourceID: string): boolean {
        if (!/^overpass_wd_(direct|indirect)$/.test(sourceID))
            return false;

        return true;
    }

    async fetchMapClusterElements(sourceID: string, bbox: BBox) {
        const wikidataSourceID = sourceID.replace("overpass_", ""),
            [overpassData, wikidataData] = await Promise.all([
                this.overpassService.fetchMapClusterElements("overpass_all", bbox, true),
                this.wikidataService.fetchMapData(wikidataSourceID, bbox)
            ]);
        return this.mergeMapData(overpassData, wikidataData);
    }

    async fetchMapElementDetails(sourceID: string, bbox: BBox) {
        const wikidataSourceID = sourceID.replace("overpass_", ""),
            [overpassData, wikidataData] = await Promise.all([
                this.overpassService.fetchMapElementDetails("overpass_all", bbox, true),
                this.wikidataService.fetchMapData(wikidataSourceID, bbox)
            ]);
        return this.mergeMapData(overpassData, wikidataData);
    }

    mergeMapData(overpassData: GeoJSON & EtymologyResponse, wikidataData: GeoJSON & EtymologyResponse): GeoJSON & EtymologyResponse {
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
                wikidataFeature.properties?.etymologies?.forEach((etymology: Etymology) => {
                    existingFeature.properties?.etymologies?.push({
                        ...etymology,
                        from_osm_id: existingFeature.properties?.osm_id,
                        from_osm_type: existingFeature.properties?.osm_type
                    });
                });
            }
            return acc;
        }, overpassData);
        out.features = out.features.filter((feature: Feature) => feature.properties?.etymologies?.length || feature.properties?.text_etymology);
        return out;
    }
}