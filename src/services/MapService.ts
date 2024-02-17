import type { EtymologyResponse } from "../model/EtymologyResponse";
import type { BBox } from "geojson";

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
    fetchMapElements(backEndID: string, onlyCentroids:boolean, bbox: BBox, language: string): Promise<EtymologyResponse>;
}