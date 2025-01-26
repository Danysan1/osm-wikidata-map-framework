import type { BBox } from "geojson";
import type { OwmfResponse } from "../model/OwmfResponse";

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
     * Execute the query to the cache or original source and return the map elements
     * 
     * @param onlyCentroids Whether to fetch only centroids or full elements with details
     */
    fetchMapElements(backEndID: string, onlyCentroids:boolean, bbox: BBox, language: string, year: number): Promise<OwmfResponse>;
}