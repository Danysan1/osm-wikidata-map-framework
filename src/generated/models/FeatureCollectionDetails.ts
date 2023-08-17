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
import type { FeatureCollectionMetadata } from './FeatureCollectionMetadata';
import {
    FeatureCollectionMetadataFromJSON,
    FeatureCollectionMetadataFromJSONTyped,
    FeatureCollectionMetadataToJSON,
} from './FeatureCollectionMetadata';

/**
 * 
 * @export
 * @interface FeatureCollectionDetails
 */
export interface FeatureCollectionDetails {
    /**
     * 
     * @type {FeatureCollectionMetadata}
     * @memberof FeatureCollectionDetails
     */
    metadata?: FeatureCollectionMetadata;
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
        
        'metadata': !exists(json, 'metadata') ? undefined : FeatureCollectionMetadataFromJSON(json['metadata']),
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
        
        'metadata': FeatureCollectionMetadataToJSON(value.metadata),
    };
}

