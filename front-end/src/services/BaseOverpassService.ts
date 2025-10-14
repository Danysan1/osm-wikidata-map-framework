import type { BBox } from "geojson";
import type { MapDatabase } from "../db/MapDatabase";
import { osmKeyToKeyID, type OwmfFeature, type OwmfResponse } from "../model/OwmfResponse";
import type { SourcePreset } from "../model/SourcePreset";
import type { MapService } from "./MapService";

export abstract class BaseOverpassService implements MapService {
    protected readonly preset: SourcePreset;
    protected readonly maxElements?: number;
    protected readonly maxRelationMembers?: number;
    protected readonly wikidata_key_codes?: Record<string, string>;
    protected readonly db?: MapDatabase;
    protected readonly baseBBox?: BBox;

    public constructor(
        preset: SourcePreset,
        maxElements?: number,
        maxRelationMembers?: number,
        db?: MapDatabase,
        bbox?: BBox
    ) {
        this.preset = preset;
        this.maxElements = maxElements;
        this.maxRelationMembers = maxRelationMembers;
        this.db = db;
        this.baseBBox = bbox;
        this.wikidata_key_codes = this.preset.osm_wikidata_keys?.reduce((acc: Record<string, string>, key) => {
            acc[osmKeyToKeyID(key)] = key;
            return acc;
        }, {});
        console.debug("BaseOverpassService initialized", { preset, maxElements, maxRelationMembers, bbox, wikidata_key_codes: this.wikidata_key_codes });
    }

    public abstract canHandleBackEnd(backEndID: string): boolean;

    public async fetchMapElements(backEndID: string, onlyCentroids: boolean, bbox: BBox, language: string, year: number): Promise<OwmfResponse> {
        language = ''; // Not used in Overpass query

        const trueBBox: BBox = bbox.map(coord => coord % 180) as BBox;
        if (this.baseBBox && (trueBBox[2] < this.baseBBox[0] || trueBBox[3] < this.baseBBox[1] || trueBBox[0] > this.baseBBox[2] || trueBBox[1] > this.baseBBox[3])) {
            console.warn("Overpass fetchMapElements: request bbox does not overlap with the instance bbox", { bbox, trueBBox, baseBBox: this.baseBBox, language });
            return { type: "FeatureCollection", features: [] };
        }

        const cachedResponse = await this.db?.getMap(this.preset?.id, backEndID, onlyCentroids, trueBBox, language, year);
        if (cachedResponse)
            return cachedResponse;

        console.debug("No cached response found, fetching from Overpass", { bbox, trueBBox, sourcePresetID: this.preset?.id, backEndID, onlyCentroids, language });
        const area = Math.abs((bbox[2] - bbox[0]) * (bbox[3] - bbox[1]));
        if (area < 0.000001 || (!onlyCentroids && area > 5)) {
            throw new Error(`Invalid bbox area: ${area} - ${bbox.join(",")}`);
        }

        const out = await this.fetchMapData(backEndID, onlyCentroids, trueBBox, year);
        if (onlyCentroids) {
            console.debug(`Overpass found ${out.features.length} centroids`);
        } else {
            console.debug(`Overpass found ${out.features.length} features before filtering`);
            out.features = out.features.filter(
                (feature: OwmfFeature) => !!feature.properties?.linked_entity_count || ( // Any linked entity is available or ...
                    backEndID.endsWith("_wd") && // ... this back-end allows features that just have wikidata=* and ...
                    (!!feature.properties?.wikidata || feature.properties?.relations?.some(rel => rel.reltags?.wikidata)) // ... wikidata=* is available on the feature or on a containing relation     
                ));
            out.total_entity_count = out.features.reduce((acc, feature) => acc + (feature.properties?.linked_entity_count ?? 0), 0);
            console.debug(`Overpass found ${out.features.length} features with ${out.total_entity_count} linked entities after filtering`);
        }
        out.language = language;

        void this.db?.addMap(out);
        return out;
    }

    protected abstract fetchMapData(backEndID: string, onlyCentroids: boolean, bbox: BBox, year: number): Promise<OwmfResponse>;
}