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
import type { GlobalMapFeatureDetailsProperties } from './GlobalMapFeatureDetailsProperties';
import {
    GlobalMapFeatureDetailsPropertiesFromJSON,
    GlobalMapFeatureDetailsPropertiesFromJSONTyped,
    GlobalMapFeatureDetailsPropertiesToJSON,
} from './GlobalMapFeatureDetailsProperties';

/**
 * 
 * @export
 * @interface GlobalMapFeatureDetails
 */
export interface GlobalMapFeatureDetails {
    /**
     * 
     * @type {GlobalMapFeatureDetailsProperties}
     * @memberof GlobalMapFeatureDetails
     */
    properties?: GlobalMapFeatureDetailsProperties;
}

/**
 * Check if a given object implements the GlobalMapFeatureDetails interface.
 */
export function instanceOfGlobalMapFeatureDetails(value: object): boolean {
    let isInstance = true;

    return isInstance;
}

export function GlobalMapFeatureDetailsFromJSON(json: any): GlobalMapFeatureDetails {
    return GlobalMapFeatureDetailsFromJSONTyped(json, false);
}

export function GlobalMapFeatureDetailsFromJSONTyped(json: any, ignoreDiscriminator: boolean): GlobalMapFeatureDetails {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'properties': !exists(json, 'properties') ? undefined : GlobalMapFeatureDetailsPropertiesFromJSON(json['properties']),
    };
}

export function GlobalMapFeatureDetailsToJSON(value?: GlobalMapFeatureDetails | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'properties': GlobalMapFeatureDetailsPropertiesToJSON(value.properties),
    };
}
