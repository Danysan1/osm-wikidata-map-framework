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

import { mapValues } from '../runtime';
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
export function instanceOfExtMetadataItem(value: object): value is ExtMetadataItem {
    return true;
}

export function ExtMetadataItemFromJSON(json: any): ExtMetadataItem {
    return ExtMetadataItemFromJSONTyped(json, false);
}

export function ExtMetadataItemFromJSONTyped(json: any, ignoreDiscriminator: boolean): ExtMetadataItem {
    if (json == null) {
        return json;
    }
    return {
        
        'source': json['source'] == null ? undefined : json['source'],
        'value': json['value'] == null ? undefined : json['value'],
        'hidden': json['hidden'] == null ? undefined : json['hidden'],
    };
}

export function ExtMetadataItemToJSON(value?: ExtMetadataItem | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'source': value['source'],
        'value': value['value'],
        'hidden': value['hidden'],
    };
}

