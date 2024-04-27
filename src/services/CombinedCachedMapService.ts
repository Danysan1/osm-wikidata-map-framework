import { BBox } from "geojson";
import { getBoolConfig, getConfig, getFloatConfig, getStringArrayConfig } from "../config";
import { MapDatabase } from "../db/MapDatabase";
import { MapService } from "./MapService";
import { OverpassService } from "./OverpassService";
import { OverpassWikidataMapService } from "./OverpassWikidataMapService";
import { QLeverMapService } from "./QLeverMapService";
import { WikidataMapService } from "./WikidataMapService";
import { EtymologyResponse } from "../model/EtymologyResponse";
import { DEFAULT_TEMPLATE, Template } from "../model/Template";

export class CombinedCachedMapService implements MapService {
    private readonly services: MapService[];

    constructor(templateID?: string) {
        this.services = [];
        void this.fetchTemplateAndCreateServices(templateID ?? "default");
    }

    private async fetchTemplateAndCreateServices(templateID: string) {
        let template: Template;
        if (templateID === DEFAULT_TEMPLATE) {
            template = {
                osm_filter_tags: getStringArrayConfig("osm_filter_tags") ?? [],
                osm_text_key: getConfig("osm_text_key") ?? undefined,
                osm_description_key: getConfig("osm_description_key") ?? undefined,
                osm_wikidata_keys: getStringArrayConfig("osm_wikidata_keys") ?? undefined,
                osm_wikidata_properties: getStringArrayConfig("osm_wikidata_properties") ?? undefined,
                fetch_parts_of_linked_entities: getBoolConfig("fetch_parts_of_linked_entities") ?? false,
                wikidata_indirect_property: getConfig("wikidata_indirect_property") ?? undefined,
                wikidata_image_property: getConfig("wikidata_image_property") ?? undefined,
                wikidata_country: getConfig("wikidata_country") ?? undefined,
                osm_country: getConfig("osm_country") ?? undefined,
                mapcomplete_theme: getConfig("mapcomplete_theme") ?? undefined,
            }
        } else {
            const templateResponse = await fetch(`templates/${templateID}.json`);
            if (!templateResponse.ok)
                throw new Error(`Failed fetching template "${templateID}.json"`);

            const templateObj: unknown = await templateResponse.json();
            if (typeof templateObj !== "object" || !Object.hasOwnProperty.call(templateObj, "osm_filter_tags"))
                throw new Error(`Invalid template object found in "${templateID}.json"`);

            template = templateObj as Template;
        }

        const qlever_enable = getBoolConfig("qlever_enable"),
            maxHours = parseInt(getConfig("cache_timeout_hours") ?? "24"),
            osm_text_key = template?.osm_text_key,
            osm_description_key = template?.osm_description_key,
            rawMaxElements = getConfig("max_map_elements"),
            maxElements = rawMaxElements ? parseInt(rawMaxElements) : undefined,
            rawMaxRelationMembers = getConfig("max_relation_members"),
            maxRelationMembers = rawMaxRelationMembers ? parseInt(rawMaxRelationMembers) : undefined,
            osmWikidataKeys = template?.osm_wikidata_keys,
            osmFilterTags = template?.osm_filter_tags,
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
            overpassService = new OverpassService(
                osm_text_key, osm_description_key, maxElements, maxRelationMembers, osmWikidataKeys, osmFilterTags, db, bbox, overpassEndpoints
            ),
            wikidataService = new WikidataMapService(db);
        this.services.push(
            wikidataService,
            overpassService,
            new OverpassWikidataMapService(overpassService, wikidataService, db)
        )
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