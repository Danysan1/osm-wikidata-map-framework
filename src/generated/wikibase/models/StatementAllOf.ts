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
 * @interface StatementAllOf
 */
export interface StatementAllOf {
    /**
     * The globally unique identifier for this Statement
     * @type {string}
     * @memberof StatementAllOf
     */
    readonly id?: string;
    /**
     * The rank of the Statement
     * @type {string}
     * @memberof StatementAllOf
     */
    rank?: StatementAllOfRankEnum;
}


/**
 * @export
 */
export const StatementAllOfRankEnum = {
    Deprecated: 'deprecated',
    Normal: 'normal',
    Preferred: 'preferred'
} as const;
export type StatementAllOfRankEnum = typeof StatementAllOfRankEnum[keyof typeof StatementAllOfRankEnum];


/**
 * Check if a given object implements the StatementAllOf interface.
 */
export function instanceOfStatementAllOf(value: object): boolean {
    let isInstance = true;

    return isInstance;
}

export function StatementAllOfFromJSON(json: any): StatementAllOf {
    return StatementAllOfFromJSONTyped(json, false);
}

export function StatementAllOfFromJSONTyped(json: any, ignoreDiscriminator: boolean): StatementAllOf {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'id': !exists(json, 'id') ? undefined : json['id'],
        'rank': !exists(json, 'rank') ? undefined : json['rank'],
    };
}

export function StatementAllOfToJSON(value?: StatementAllOf | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'rank': value.rank,
    };
}

