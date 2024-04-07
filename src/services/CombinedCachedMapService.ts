import { BBox } from "geojson";
import { getBoolConfig, getConfig, getFloatConfig, getStringArrayConfig } from "../config";
import { MapDatabase } from "../db/MapDatabase";
import { MapService } from "./MapService";
import { OverpassService } from "./OverpassService";
import { OverpassWikidataMapService } from "./OverpassWikidataMapService";
import { QLeverMapService } from "./QLeverMapService";
import { WikidataMapService } from "./WikidataMapService";
import { EtymologyResponse } from "../model/EtymologyResponse";

export class CombinedCachedMapService implements MapService {
    private readonly services: MapService[];

    constructor() {
        const qlever_enable = getBoolConfig("qlever_enable"),
            maxHours = parseInt(getConfig("cache_timeout_hours") ?? "24"),
            osm_text_key = getConfig("osm_text_key") ?? undefined,
            osm_description_key = getConfig("osm_description_key") ?? undefined,
            rawMaxElements = getConfig("max_map_elements"),
            maxElements = rawMaxElements ? parseInt(rawMaxElements) : undefined,
            rawMaxRelationMembers = getConfig("max_relation_members"),
            maxRelationMembers = rawMaxRelationMembers ? parseInt(rawMaxRelationMembers) : undefined,
            osmWikidataKeys = getStringArrayConfig("osm_wikidata_keys"),
            osmFilterTags = getStringArrayConfig("osm_filter_tags"),
            overpassEndpoints = getStringArrayConfig("overpass_endpoints"),
            westLon = getFloatConfig("min_lon"),
            southLat = getFloatConfig("min_lat"),
            eastLon = getFloatConfig("max_lon"),
            northLat = getFloatConfig("max_lat"),
            bbox: BBox | undefined = westLon && southLat && eastLon && northLat ? [westLon, southLat, eastLon, northLat] : undefined;
        if (process.env.NODE_ENV === 'development') console.debug("CombinedCachedMapService: initializing map services", {
            qlever_enable, maxHours, osm_text_key, osm_description_key, maxElements, maxRelationMembers, osmWikidataKeys, osmFilterTags, overpassEndpoints
        });
        const db = new MapDatabase(maxHours),
            overpassService = new OverpassService(osm_text_key, osm_description_key, maxElements, maxRelationMembers, osmWikidataKeys, osmFilterTags, db, bbox, overpassEndpoints),
            wikidataService = new WikidataMapService(db);
        this.services = [
            wikidataService,
            overpassService,
            new OverpassWikidataMapService(overpassService, wikidataService, db)
        ];
        if (qlever_enable)
            this.services.push(new QLeverMapService(osm_text_key, osm_description_key, maxElements, maxRelationMembers, osmWikidataKeys, osmFilterTags, db, bbox));
    }

    public canHandleBackEnd(backEndID: string): boolean {
        return this.services?.some(service => service.canHandleBackEnd(backEndID));
    }

    public fetchMapElements(backEndID: string, onlyCentroids: boolean, bbox: BBox, language: string): Promise<EtymologyResponse> {
        const service = this.services?.find(service => service.canHandleBackEnd(backEndID));
        if (!service)
            throw new Error("No service found for source ID " + backEndID);

        return service.fetchMapElements(backEndID, onlyCentroids, bbox, language);
    }
}