/* tslint:disable */
/* eslint-disable */
/**
 * Wikibase REST API
 * OpenAPI definition of Wikibase REST API
 *
 * The version of the OpenAPI document: 0.4
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
 * @interface StatementPatchSchema
 */
export interface StatementPatchSchema {
    /**
     * 
     * @type {any}
     * @memberof StatementPatchSchema
     */
    patch: any | null;
    /**
     * 
     * @type {Array<string>}
     * @memberof StatementPatchSchema
     */
    tags?: Array<string>;
    /**
     * 
     * @type {boolean}
     * @memberof StatementPatchSchema
     */
    bot?: boolean;
    /**
     * 
     * @type {string}
     * @memberof StatementPatchSchema
     */
    comment?: string;
}

/**
 * Check if a given object implements the StatementPatchSchema interface.
 */
export function instanceOfStatementPatchSchema(value: object): value is StatementPatchSchema {
    if (!('patch' in value) || value['patch'] === undefined) return false;
    return true;
}

export function StatementPatchSchemaFromJSON(json: any): StatementPatchSchema {
    return StatementPatchSchemaFromJSONTyped(json, false);
}

export function StatementPatchSchemaFromJSONTyped(json: any, ignoreDiscriminator: boolean): StatementPatchSchema {
    if (json == null) {
        return json;
    }
    return {
        
        'patch': json['patch'],
        'tags': json['tags'] == null ? undefined : json['tags'],
        'bot': json['bot'] == null ? undefined : json['bot'],
        'comment': json['comment'] == null ? undefined : json['comment'],
    };
}

export function StatementPatchSchemaToJSON(value?: StatementPatchSchema | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'patch': value['patch'],
        'tags': value['tags'],
        'bot': value['bot'],
        'comment': value['comment'],
    };
}
