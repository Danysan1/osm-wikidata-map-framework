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
import type { Page } from './Page';
import {
    PageFromJSON,
    PageFromJSONTyped,
    PageToJSON,
} from './Page';

/**
 * 
 * @export
 * @interface CommonsApiResponseQuery
 */
export interface CommonsApiResponseQuery {
    /**
     * 
     * @type {{ [key: string]: Page; }}
     * @memberof CommonsApiResponseQuery
     */
    pages?: { [key: string]: Page; };
}

/**
 * Check if a given object implements the CommonsApiResponseQuery interface.
 */
export function instanceOfCommonsApiResponseQuery(value: object): value is CommonsApiResponseQuery {
    return true;
}

export function CommonsApiResponseQueryFromJSON(json: any): CommonsApiResponseQuery {
    return CommonsApiResponseQueryFromJSONTyped(json, false);
}

export function CommonsApiResponseQueryFromJSONTyped(json: any, ignoreDiscriminator: boolean): CommonsApiResponseQuery {
    if (json == null) {
        return json;
    }
    return {
        
        'pages': json['pages'] == null ? undefined : (mapValues(json['pages'], PageFromJSON)),
    };
}

export function CommonsApiResponseQueryToJSON(value?: CommonsApiResponseQuery | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'pages': value['pages'] == null ? undefined : (mapValues(value['pages'], PageToJSON)),
    };
}

