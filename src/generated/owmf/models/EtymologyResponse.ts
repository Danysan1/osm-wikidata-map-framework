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
import type { FeatureCollectionMetadata } from './FeatureCollectionMetadata';
import {
    FeatureCollectionMetadataFromJSON,
    FeatureCollectionMetadataFromJSONTyped,
    FeatureCollectionMetadataToJSON,
} from './FeatureCollectionMetadata';

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
     * Bounding box of the features
     * @type {Array<number>}
     * @memberof EtymologyResponse
     */
    bbox?: Array<number>;
    /**
     * 
     * @type {FeatureCollectionMetadata}
     * @memberof EtymologyResponse
     */
    metadata?: FeatureCollectionMetadata;
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
        'metadata': !exists(json, 'metadata') ? undefined : FeatureCollectionMetadataFromJSON(json['metadata']),
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
        'metadata': FeatureCollectionMetadataToJSON(value.metadata),
    };
}

