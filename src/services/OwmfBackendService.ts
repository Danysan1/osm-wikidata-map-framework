import { debug, getConfig } from "../config";
import { GeoJSON, BBox } from "geojson";
import { ElementResponse, EtymologyResponse } from "../generated/owmf";
import { OwmfApi } from "../generated/owmf";
import { MapDatabase } from "../db/MapDatabase";

export class OwmfBackendService {
    private api: OwmfApi;
    private db: MapDatabase;
    protected defaultLanguage: string;
    protected language?: string;

    constructor(db: MapDatabase) {
        this.api = new OwmfApi();
        this.defaultLanguage = getConfig("default_language") || 'en';
        this.language = document.documentElement.lang.split('-').at(0);
        this.db = db;
    }

    canHandleSource(sourceID: string): boolean {
        if (!/^(db|overpass|wd)_(all|direct|indirect|osm|propagated|qualifier|reverse|wd)[_a-zA-Z0-9]*$/.test(sourceID))
            return false;

        return true;
    }

    async fetchMapClusterElements(sourceID: string, bbox: BBox): Promise<GeoJSON & ElementResponse> {
        const source = "elements_" + sourceID;
        let out = await this.db.getMap(source, bbox, this.language) as GeoJSON & ElementResponse | undefined;
        if (out) {
            if (debug) console.info("Overpass cache hit, using cached response", { sourceID, bbox, language: this.language, out });
        } else {
            if (debug) console.info("Overpass cache miss, fetching data", { sourceID, bbox, language: this.language });
            out = await this.api.getElements({
                minLon: bbox[0],
                minLat: bbox[1],
                maxLon: bbox[2],
                maxLat: bbox[3],
                source: sourceID,
            }) as GeoJSON & ElementResponse;
            if (!out)
                throw new Error("Failed fetching data from OWMF API");
            if (!out.bbox)
                out.bbox = bbox;
            out.sourceID = source;
            this.db.addMap(out);
        }
        if (debug) console.info(`OWMF fetchMapClusterElements found ${out.features.length} features`, out);
        return out;
    }

    async fetchMapElementDetails(source: string, bbox: BBox): Promise<GeoJSON & EtymologyResponse> {
        const sourceID = "details_" + source;
        let out = await this.db.getMap(sourceID, bbox, this.language);
        if (out) {
            if (debug) console.info("Overpass cache hit, using cached response", { source, bbox, language: this.language, out });
        } else {
            if (debug) console.info("Overpass cache miss, fetching data", { source, bbox, language: this.language });
            out = await this.api.getEtymologies({
                minLon: bbox[0],
                minLat: bbox[1],
                maxLon: bbox[2],
                maxLat: bbox[3],
                source,
                language: this.language || this.defaultLanguage
            }) as GeoJSON & EtymologyResponse;
            if (!out)
                throw new Error("Failed fetching data from OWMF API");
            if (!out.bbox)
                out.bbox = bbox;
            out.sourceID = source;
            this.db.addMap(out);
        }
        if (debug) console.info(`OWMF fetchMapElementDetails found ${out.features.length} features`, out);
        return out;
    }
}