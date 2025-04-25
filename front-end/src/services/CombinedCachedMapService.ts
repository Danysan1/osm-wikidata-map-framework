import type { BBox } from "geojson";
import { MapDatabase } from "../db/MapDatabase";
import type { OwmfResponse } from "../model/OwmfResponse";
import type { SourcePreset } from "../model/SourcePreset";
import type { MapService } from "./MapService";
import { OverpassService } from "./OverpassService/OverpassService";
import { OverpassWikidataMapService } from "./OverpassWikidataMapService";
import { QLeverMapService } from "./QLeverMapService/QLeverMapService";
import { WikidataMapService } from "./WikidataMapService/WikidataMapService";

export class CombinedCachedMapService implements MapService {
    private readonly services: MapService[];
    private alreadyFetchingPromise: Promise<OwmfResponse> | undefined;

    constructor(sourcePreset: SourcePreset) {
        this.services = [];
        const maxHours = parseInt(process.env.NEXT_PUBLIC_OWMF_cache_timeout_hours ?? "24"),
            rawMaxElements = process.env.NEXT_PUBLIC_OWMF_max_map_elements,
            maxElements = rawMaxElements ? parseInt(rawMaxElements) : undefined,
            rawMaxRelationMembers = process.env.NEXT_PUBLIC_OWMF_max_relation_members,
            maxRelationMembers = rawMaxRelationMembers ? parseInt(rawMaxRelationMembers) : undefined,
            westLon = process.env.NEXT_PUBLIC_OWMF_min_lon ? parseFloat(process.env.NEXT_PUBLIC_OWMF_min_lon) : undefined,
            southLat = process.env.NEXT_PUBLIC_OWMF_min_lat ? parseFloat(process.env.NEXT_PUBLIC_OWMF_min_lat) : undefined,
            eastLon = process.env.NEXT_PUBLIC_OWMF_max_lon ? parseFloat(process.env.NEXT_PUBLIC_OWMF_max_lon) : undefined,
            northLat = process.env.NEXT_PUBLIC_OWMF_max_lat ? parseFloat(process.env.NEXT_PUBLIC_OWMF_max_lat) : undefined,
            bbox: BBox | undefined = westLon && southLat && eastLon && northLat ? [westLon, southLat, eastLon, northLat] : undefined;
        console.debug(
            "CombinedCachedMapService: initializing map services",
            { maxHours, maxElements, maxRelationMembers }
        );
        const db = new MapDatabase(),
            overpassService = new OverpassService(sourcePreset, maxElements, maxRelationMembers, db, bbox),
            wikidataService = new WikidataMapService(sourcePreset, maxElements, db);
        this.services.push(
            wikidataService,
            overpassService,
            new OverpassWikidataMapService(sourcePreset, overpassService, wikidataService, db)
        )
        if (process.env.NEXT_PUBLIC_OWMF_qlever_enable === "true")
            this.services.push(new QLeverMapService(sourcePreset, maxElements, maxRelationMembers, db, bbox));

        setTimeout(() => void db.clear(maxHours), 10_000);
    }

    public canHandleBackEnd(backEndID: string): boolean {
        return this.services?.some(service => service.canHandleBackEnd(backEndID));
    }

    public async fetchMapElements(backEndID: string, onlyCentroids: boolean, bbox: BBox, language: string, year: number): Promise<OwmfResponse> {
        if (this.alreadyFetchingPromise !== undefined) {
            console.debug("fetchMapElements: Already fetching data from back-end, skipping another fetch");
            return this.alreadyFetchingPromise;
        }

        const service = this.services?.find(service => service.canHandleBackEnd(backEndID));
        if (!service)
            throw new Error("No service found for source ID " + backEndID);

        this.alreadyFetchingPromise = service.fetchMapElements(backEndID, onlyCentroids, bbox, language, year);

        const out = await this.alreadyFetchingPromise;
        this.alreadyFetchingPromise = undefined;
        return out;
    }
}