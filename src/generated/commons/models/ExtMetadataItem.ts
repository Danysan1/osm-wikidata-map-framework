/* tslint:disable */
/* eslint-disable */
/**
 * Wikimedia Commons REST API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 1.0.0
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
 * @interface ExtMetadataItem
 */
export interface ExtMetadataItem {
    /**
     * 
     * @type {string}
     * @memberof ExtMetadataItem
     */
    source?: string;
    /**
     * 
     * @type {string}
     * @memberof ExtMetadataItem
     */
    value?: string;
    /**
     * 
     * @type {boolean}
     * @memberof ExtMetadataItem
     */
    hidden?: boolean;
}

/**
 * Check if a given object implements the ExtMetadataItem interface.
 */
export function instanceOfExtMetadataItem(value: object): boolean {
    let isInstance = true;

    return isInstance;
}

export function ExtMetadataItemFromJSON(json: any): ExtMetadataItem {
    return ExtMetadataItemFromJSONTyped(json, false);
}

export function ExtMetadataItemFromJSONTyped(json: any, ignoreDiscriminator: boolean): ExtMetadataItem {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'source': !exists(json, 'source') ? undefined : json['source'],
        'value': !exists(json, 'value') ? undefined : json['value'],
        'hidden': !exists(json, 'hidden') ? undefined : json['hidden'],
    };
}

export function ExtMetadataItemToJSON(value?: ExtMetadataItem | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'source': value.source,
        'value': value.value,
        'hidden': value.hidden,
    };
}
