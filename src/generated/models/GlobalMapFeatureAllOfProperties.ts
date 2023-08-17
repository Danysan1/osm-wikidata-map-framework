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
/**
 * 
 * @export
 * @interface GlobalMapFeatureAllOfProperties
 */
export interface GlobalMapFeatureAllOfProperties {
    /**
     * 
     * @type {number}
     * @memberof GlobalMapFeatureAllOfProperties
     */
    num: number;
}

/**
 * Check if a given object implements the GlobalMapFeatureAllOfProperties interface.
 */
export function instanceOfGlobalMapFeatureAllOfProperties(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "num" in value;

    return isInstance;
}

export function GlobalMapFeatureAllOfPropertiesFromJSON(json: any): GlobalMapFeatureAllOfProperties {
    return GlobalMapFeatureAllOfPropertiesFromJSONTyped(json, false);
}

export function GlobalMapFeatureAllOfPropertiesFromJSONTyped(json: any, ignoreDiscriminator: boolean): GlobalMapFeatureAllOfProperties {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'num': json['num'],
    };
}

export function GlobalMapFeatureAllOfPropertiesToJSON(value?: GlobalMapFeatureAllOfProperties | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'num': value.num,
    };
}

