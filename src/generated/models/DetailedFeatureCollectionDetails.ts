/* tslint:disable */
/* eslint-disable */
/**
 * OSM-Wikidata Map Framework API
 * Programmatically interact with a site based on OSM-Wikidata Map Framework
 *
 * The version of the OpenAPI document: 1.6.1
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { exists, mapValues } from '../runtime';
import type { DetailedFeatureCollectionDetailsMetadata } from './DetailedFeatureCollectionDetailsMetadata';
import {
    DetailedFeatureCollectionDetailsMetadataFromJSON,
    DetailedFeatureCollectionDetailsMetadataFromJSONTyped,
    DetailedFeatureCollectionDetailsMetadataToJSON,
} from './DetailedFeatureCollectionDetailsMetadata';

/**
 * 
 * @export
 * @interface DetailedFeatureCollectionDetails
 */
export interface DetailedFeatureCollectionDetails {
    /**
     * 
     * @type {DetailedFeatureCollectionDetailsMetadata}
     * @memberof DetailedFeatureCollectionDetails
     */
    metadata?: DetailedFeatureCollectionDetailsMetadata;
}

/**
 * Check if a given object implements the DetailedFeatureCollectionDetails interface.
 */
export function instanceOfDetailedFeatureCollectionDetails(value: object): boolean {
    let isInstance = true;

    return isInstance;
}

export function DetailedFeatureCollectionDetailsFromJSON(json: any): DetailedFeatureCollectionDetails {
    return DetailedFeatureCollectionDetailsFromJSONTyped(json, false);
}

export function DetailedFeatureCollectionDetailsFromJSONTyped(json: any, ignoreDiscriminator: boolean): DetailedFeatureCollectionDetails {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'metadata': !exists(json, 'metadata') ? undefined : DetailedFeatureCollectionDetailsMetadataFromJSON(json['metadata']),
    };
}

export function DetailedFeatureCollectionDetailsToJSON(value?: DetailedFeatureCollectionDetails | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'metadata': DetailedFeatureCollectionDetailsMetadataToJSON(value.metadata),
    };
}

