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
import type { CommonsApiResponseQuery } from './CommonsApiResponseQuery';
import {
    CommonsApiResponseQueryFromJSON,
    CommonsApiResponseQueryFromJSONTyped,
    CommonsApiResponseQueryToJSON,
} from './CommonsApiResponseQuery';

/**
 * 
 * @export
 * @interface CommonsApiResponse
 */
export interface CommonsApiResponse {
    /**
     * 
     * @type {CommonsApiResponseQuery}
     * @memberof CommonsApiResponse
     */
    query?: CommonsApiResponseQuery;
}

/**
 * Check if a given object implements the CommonsApiResponse interface.
 */
export function instanceOfCommonsApiResponse(value: object): value is CommonsApiResponse {
    return true;
}

export function CommonsApiResponseFromJSON(json: any): CommonsApiResponse {
    return CommonsApiResponseFromJSONTyped(json, false);
}

export function CommonsApiResponseFromJSONTyped(json: any, ignoreDiscriminator: boolean): CommonsApiResponse {
    if (json == null) {
        return json;
    }
    return {
        
        'query': json['query'] == null ? undefined : CommonsApiResponseQueryFromJSON(json['query']),
    };
}

export function CommonsApiResponseToJSON(value?: CommonsApiResponse | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'query': CommonsApiResponseQueryToJSON(value['query']),
    };
}

