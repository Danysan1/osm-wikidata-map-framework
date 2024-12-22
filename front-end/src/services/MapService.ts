import type { OwmfResponse } from "../model/OwmfResponse";
import type { BBox } from "geojson";

/**
 * Service to fetch map elements from a back-end.
 * Implements the strategy pattern to allow different back-ends to be used interchangeably.
 */
export interface MapService {
    /**
     * Check whether this service can handle the given source ID.
     */
    canHandleBackEnd(backEndID: string): boolean;

    /**
     * 
     * @param backEndID 
     * @param onlyCentroids Whether to fetch only centroids or full elements with details
     * @param bbox 
     * @param language 
     */
    fetchMapElements(backEndID: string, onlyCentroids:boolean, bbox: BBox, language: string): Promise<OwmfResponse>;
}