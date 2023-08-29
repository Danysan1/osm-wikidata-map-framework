/* tslint:disable */
/* eslint-disable */
/**
 * OSM-Wikidata Map Framework API
 * Programmatically interact with a site based on OSM-Wikidata Map Framework
 *
 * The version of the OpenAPI document: 2.0.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { exists, mapValues } from '../runtime';
import type { GeoJSONFeature } from './GeoJSONFeature';
import {
    GeoJSONFeatureFromJSON,
    GeoJSONFeatureFromJSONTyped,
    GeoJSONFeatureToJSON,
} from './GeoJSONFeature';

/**
 * 
 * @export
 * @interface ElementResponse
 */
export interface ElementResponse {
    /**
     * 
     * @type {string}
     * @memberof ElementResponse
     */
    type: ElementResponseTypeEnum;
    /**
     * 
     * @type {Array<GeoJSONFeature>}
     * @memberof ElementResponse
     */
    features: Array<GeoJSONFeature>;
    /**
     * 2D/3D bounding box of the feature[s], in the order minLon,minLat,maxLon,maxLat[,minAlt,maxAlt]
     * @type {Array<number>}
     * @memberof ElementResponse
     */
    bbox?: Array<number>;
    /**
     * 
     * @type {string}
     * @memberof ElementResponse
     */
    sourceID?: string;
    /**
     * ISO string for the time the query was run
     * @type {string}
     * @memberof ElementResponse
     */
    timestamp?: string;
    /**
     * Total number of etymologies linked to the features
     * @type {number}
     * @memberof ElementResponse
     */
    etymology_count?: number;
    /**
     * Wikidata SPARQL query used to fetch the features
     * @type {string}
     * @memberof ElementResponse
     */
    wikidata_query?: string;
    /**
     * OverpassQL query used to fetch the features
     * @type {string}
     * @memberof ElementResponse
     */
    overpass_query?: string;
    /**
     * Language fetched
     * @type {string}
     * @memberof ElementResponse
     */
    language?: string;
}


/**
 * @export
 */
export const ElementResponseTypeEnum = {
    FeatureCollection: 'FeatureCollection'
} as const;
export type ElementResponseTypeEnum = typeof ElementResponseTypeEnum[keyof typeof ElementResponseTypeEnum];


/**
 * Check if a given object implements the ElementResponse interface.
 */
export function instanceOfElementResponse(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "type" in value;
    isInstance = isInstance && "features" in value;

    return isInstance;
}

export function ElementResponseFromJSON(json: any): ElementResponse {
    return ElementResponseFromJSONTyped(json, false);
}

export function ElementResponseFromJSONTyped(json: any, ignoreDiscriminator: boolean): ElementResponse {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'type': json['type'],
        'features': ((json['features'] as Array<any>).map(GeoJSONFeatureFromJSON)),
        'bbox': !exists(json, 'bbox') ? undefined : json['bbox'],
        'sourceID': !exists(json, 'sourceID') ? undefined : json['sourceID'],
        'timestamp': !exists(json, 'timestamp') ? undefined : json['timestamp'],
        'etymology_count': !exists(json, 'etymology_count') ? undefined : json['etymology_count'],
        'wikidata_query': !exists(json, 'wikidata_query') ? undefined : json['wikidata_query'],
        'overpass_query': !exists(json, 'overpass_query') ? undefined : json['overpass_query'],
        'language': !exists(json, 'language') ? undefined : json['language'],
    };
}

export function ElementResponseToJSON(value?: ElementResponse | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'type': value.type,
        'features': ((value.features as Array<any>).map(GeoJSONFeatureToJSON)),
        'bbox': value.bbox,
        'sourceID': value.sourceID,
        'timestamp': value.timestamp,
        'etymology_count': value.etymology_count,
        'wikidata_query': value.wikidata_query,
        'overpass_query': value.overpass_query,
        'language': value.language,
    };
}
