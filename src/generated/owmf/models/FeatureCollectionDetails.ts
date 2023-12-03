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
/**
 * 
 * @export
 * @interface FeatureCollectionDetails
 */
export interface FeatureCollectionDetails {
    /**
     * 
     * @type {string}
     * @memberof FeatureCollectionDetails
     */
    sourceID?: string;
    /**
     * ISO string for the time the query was run
     * @type {string}
     * @memberof FeatureCollectionDetails
     */
    timestamp?: string;
    /**
     * Total number of etymologies linked to the features
     * @type {number}
     * @memberof FeatureCollectionDetails
     */
    etymology_count?: number;
    /**
     * SPARQL query used to fetch the features from Wikidata Query Service
     * @type {string}
     * @memberof FeatureCollectionDetails
     */
    wdqs_query?: string;
    /**
     * SPARQL query used to fetch the features from Wikidata through QLever
     * @type {string}
     * @memberof FeatureCollectionDetails
     */
    qlever_wd_query?: string;
    /**
     * SPARQL query used to fetch the features from OpenStreetMap through QLever
     * @type {string}
     * @memberof FeatureCollectionDetails
     */
    qlever_osm_query?: string;
    /**
     * OverpassQL query used to fetch the features
     * @type {string}
     * @memberof FeatureCollectionDetails
     */
    overpass_query?: string;
    /**
     * Whether the response has been truncated due to the maximum number of features being reached
     * @type {boolean}
     * @memberof FeatureCollectionDetails
     */
    truncated?: boolean;
    /**
     * Language fetched
     * @type {string}
     * @memberof FeatureCollectionDetails
     */
    language?: string;
}

/**
 * Check if a given object implements the FeatureCollectionDetails interface.
 */
export function instanceOfFeatureCollectionDetails(value: object): boolean {
    let isInstance = true;

    return isInstance;
}

export function FeatureCollectionDetailsFromJSON(json: any): FeatureCollectionDetails {
    return FeatureCollectionDetailsFromJSONTyped(json, false);
}

export function FeatureCollectionDetailsFromJSONTyped(json: any, ignoreDiscriminator: boolean): FeatureCollectionDetails {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
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

export function FeatureCollectionDetailsToJSON(value?: FeatureCollectionDetails | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
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

