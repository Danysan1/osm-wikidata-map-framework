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
import type { EtymologyFeature } from './EtymologyFeature';
import {
    EtymologyFeatureFromJSON,
    EtymologyFeatureFromJSONTyped,
    EtymologyFeatureToJSON,
} from './EtymologyFeature';

/**
 * 
 * @export
 * @interface EtymologyResponse
 */
export interface EtymologyResponse {
    /**
     * 
     * @type {string}
     * @memberof EtymologyResponse
     */
    type: EtymologyResponseTypeEnum;
    /**
     * 
     * @type {Array<EtymologyFeature>}
     * @memberof EtymologyResponse
     */
    features: Array<EtymologyFeature>;
    /**
     * 2D/3D bounding box of the feature[s], in the order minLon,minLat,maxLon,maxLat[,minAlt,maxAlt]
     * @type {Array<number>}
     * @memberof EtymologyResponse
     */
    bbox?: Array<number>;
    /**
     * 
     * @type {string}
     * @memberof EtymologyResponse
     */
    sourceID?: string;
    /**
     * ISO string for the time the query was run
     * @type {string}
     * @memberof EtymologyResponse
     */
    timestamp?: string;
    /**
     * Total number of etymologies linked to the features
     * @type {number}
     * @memberof EtymologyResponse
     */
    etymology_count?: number;
    /**
     * SPARQL query used to fetch the features from Wikidata Query Service
     * @type {string}
     * @memberof EtymologyResponse
     */
    wdqs_query?: string;
    /**
     * SPARQL query used to fetch the features from Wikidata through QLever
     * @type {string}
     * @memberof EtymologyResponse
     */
    qlever_wd_query?: string;
    /**
     * SPARQL query used to fetch the features from OpenStreetMap through QLever
     * @type {string}
     * @memberof EtymologyResponse
     */
    qlever_osm_query?: string;
    /**
     * OverpassQL query used to fetch the features
     * @type {string}
     * @memberof EtymologyResponse
     */
    overpass_query?: string;
    /**
     * Whether the response has been truncated due to the maximum number of features being reached
     * @type {boolean}
     * @memberof EtymologyResponse
     */
    truncated?: boolean;
    /**
     * Language fetched
     * @type {string}
     * @memberof EtymologyResponse
     */
    language?: string;
}


/**
 * @export
 */
export const EtymologyResponseTypeEnum = {
    FeatureCollection: 'FeatureCollection'
} as const;
export type EtymologyResponseTypeEnum = typeof EtymologyResponseTypeEnum[keyof typeof EtymologyResponseTypeEnum];


/**
 * Check if a given object implements the EtymologyResponse interface.
 */
export function instanceOfEtymologyResponse(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "type" in value;
    isInstance = isInstance && "features" in value;

    return isInstance;
}

export function EtymologyResponseFromJSON(json: any): EtymologyResponse {
    return EtymologyResponseFromJSONTyped(json, false);
}

export function EtymologyResponseFromJSONTyped(json: any, ignoreDiscriminator: boolean): EtymologyResponse {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'type': json['type'],
        'features': ((json['features'] as Array<any>).map(EtymologyFeatureFromJSON)),
        'bbox': !exists(json, 'bbox') ? undefined : json['bbox'],
        'sourceID': !exists(json, 'sourceID') ? undefined : json['sourceID'],
        'timestamp': !exists(json, 'timestamp') ? undefined : json['timestamp'],
        'etymology_count': !exists(json, 'etymology_count') ? undefined : json['etymology_count'],
        'wdqs_query': !exists(json, 'wdqs_query') ? undefined : json['wdqs_query'],
        'qlever_wd_query': !exists(json, 'qlever_wd_query') ? undefined : json['qlever_wd_query'],
        'qlever_osm_query': !exists(json, 'qlever_osm_query') ? undefined : json['qlever_osm_query'],
        'overpass_query': !exists(json, 'overpass_query') ? undefined : json['overpass_query'],
        'truncated': !exists(json, 'truncated') ? undefined : json['truncated'],
        'language': !exists(json, 'language') ? undefined : json['language'],
    };
}

export function EtymologyResponseToJSON(value?: EtymologyResponse | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'type': value.type,
        'features': ((value.features as Array<any>).map(EtymologyFeatureToJSON)),
        'bbox': value.bbox,
        'sourceID': value.sourceID,
        'timestamp': value.timestamp,
        'etymology_count': value.etymology_count,
        'wdqs_query': value.wdqs_query,
        'qlever_wd_query': value.qlever_wd_query,
        'qlever_osm_query': value.qlever_osm_query,
        'overpass_query': value.overpass_query,
        'truncated': value.truncated,
        'language': value.language,
    };
}

