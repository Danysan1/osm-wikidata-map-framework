/* tslint:disable */
/* eslint-disable */
/**
 * Wikibase REST API
 * OpenAPI definition of Wikibase REST API
 *
 * The version of the OpenAPI document: 0.1
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
 * @interface StatementAllOf1Property
 */
export interface StatementAllOf1Property {
    /**
     * The ID of the Property
     * @type {string}
     * @memberof StatementAllOf1Property
     */
    id?: string;
    /**
     * The data type of the Property
     * @type {string}
     * @memberof StatementAllOf1Property
     */
    readonly data_type?: string | null;
}

/**
 * Check if a given object implements the StatementAllOf1Property interface.
 */
export function instanceOfStatementAllOf1Property(value: object): boolean {
    let isInstance = true;

    return isInstance;
}

export function StatementAllOf1PropertyFromJSON(json: any): StatementAllOf1Property {
    return StatementAllOf1PropertyFromJSONTyped(json, false);
}

export function StatementAllOf1PropertyFromJSONTyped(json: any, ignoreDiscriminator: boolean): StatementAllOf1Property {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'id': !exists(json, 'id') ? undefined : json['id'],
        'data_type': !exists(json, 'data-type') ? undefined : json['data-type'],
    };
}

export function StatementAllOf1PropertyToJSON(value?: StatementAllOf1Property | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'id': value.id,
    };
}

