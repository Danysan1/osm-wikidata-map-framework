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
 * GeoJSON Feature collection with additional OWMF-related details
 * @export
 * @interface DetailedFeatureCollection
 */
export interface DetailedFeatureCollection {
    /**
     * 
     * @type {string}
     * @memberof DetailedFeatureCollection
     */
    type: DetailedFeatureCollectionTypeEnum;
    /**
     * 
     * @type {Array<GeoJSONFeature>}
     * @memberof DetailedFeatureCollection
     */
    features: Array<GeoJSONFeature>;
    /**
     * Bounding box of the features
     * @type {Array<number>}
     * @memberof DetailedFeatureCollection
     */
    bbox?: Array<number>;
    /**
     * 
     * @type {string}
     * @memberof DetailedFeatureCollection
     */
    sourceID?: string;
    /**
     * ISO string for the time the query was run
     * @type {string}
     * @memberof DetailedFeatureCollection
     */
    timestamp?: string;
    /**
     * Total number of etymologies linked to the features
     * @type {number}
     * @memberof DetailedFeatureCollection
     */
    etymology_count?: number;
    /**
     * Wikidata SPARQL query used to fetch the features
     * @type {string}
     * @memberof DetailedFeatureCollection
     */
    wikidata_query?: string;
    /**
     * OverpassQL query used to fetch the features
     * @type {string}
     * @memberof DetailedFeatureCollection
     */
    overpass_query?: string;
}


/**
 * @export
 */
export const DetailedFeatureCollectionTypeEnum = {
    FeatureCollection: 'FeatureCollection'
} as const;
export type DetailedFeatureCollectionTypeEnum = typeof DetailedFeatureCollectionTypeEnum[keyof typeof DetailedFeatureCollectionTypeEnum];


/**
 * Check if a given object implements the DetailedFeatureCollection interface.
 */
export function instanceOfDetailedFeatureCollection(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "type" in value;
    isInstance = isInstance && "features" in value;

    return isInstance;
}

export function DetailedFeatureCollectionFromJSON(json: any): DetailedFeatureCollection {
    return DetailedFeatureCollectionFromJSONTyped(json, false);
}

export function DetailedFeatureCollectionFromJSONTyped(json: any, ignoreDiscriminator: boolean): DetailedFeatureCollection {
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
    };
}

export function DetailedFeatureCollectionToJSON(value?: DetailedFeatureCollection | null): any {
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
    };
}

