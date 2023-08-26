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
import type { GlobalMapFeature } from './GlobalMapFeature';
import {
    GlobalMapFeatureFromJSON,
    GlobalMapFeatureFromJSONTyped,
    GlobalMapFeatureToJSON,
} from './GlobalMapFeature';

/**
 * 
 * @export
 * @interface GlobalMapFeatures
 */
export interface GlobalMapFeatures {
    /**
     * 
     * @type {Array<GlobalMapFeature>}
     * @memberof GlobalMapFeatures
     */
    features?: Array<GlobalMapFeature>;
}

/**
 * Check if a given object implements the GlobalMapFeatures interface.
 */
export function instanceOfGlobalMapFeatures(value: object): boolean {
    let isInstance = true;

    return isInstance;
}

export function GlobalMapFeaturesFromJSON(json: any): GlobalMapFeatures {
    return GlobalMapFeaturesFromJSONTyped(json, false);
}

export function GlobalMapFeaturesFromJSONTyped(json: any, ignoreDiscriminator: boolean): GlobalMapFeatures {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'features': !exists(json, 'features') ? undefined : ((json['features'] as Array<any>).map(GlobalMapFeatureFromJSON)),
    };
}

export function GlobalMapFeaturesToJSON(value?: GlobalMapFeatures | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'features': value.features === undefined ? undefined : ((value.features as Array<any>).map(GlobalMapFeatureToJSON)),
    };
}

