import type { EtymologyResponse } from "../model/EtymologyResponse";
import type { BBox } from "geojson";

export interface MapService {
    /**
     * Check whether this service can handle the given source ID.
     */
    canHandleBackEnd(backEndID: string): boolean;

    /**
     * Fetch elements for clustering for low-zoom map view in the given bounding box.
     */
    fetchMapClusterElements(backEndID: string, bbox: BBox, language: string): Promise<EtymologyResponse>;

    /**
     * Fetch elements with details for high-zoom map view in the given bounding box.
     */
    fetchMapElementDetails(backEndID: string, bbox: BBox, language: string): Promise<EtymologyResponse>;
}