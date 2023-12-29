import type { EtymologyResponse } from "../model/EtymologyResponse";
import type { BBox } from "geojson";

export interface MapService {
    /**
     * Check whether this service can handle the given source ID.
     */
    canHandleSource(sourceID: string): boolean;

    /**
     * Fetch elements for clustering for low-zoom map view in the given bounding box.
     */
    fetchMapClusterElements(sourceID: string, bbox: BBox): Promise<EtymologyResponse>;

    /**
     * Fetch elements with details for high-zoom map view in the given bounding box.
     */
    fetchMapElementDetails(sourceID: string, bbox: BBox): Promise<EtymologyResponse>;
}