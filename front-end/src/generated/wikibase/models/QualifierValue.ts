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
 * @interface QualifierValue
 */
export interface QualifierValue {
    /**
     * 
     * @type {any}
     * @memberof QualifierValue
     */
    content?: any | null;
    /**
     * The value type
     * @type {string}
     * @memberof QualifierValue
     */
    type?: QualifierValueTypeEnum;
}


/**
 * @export
 */
export const QualifierValueTypeEnum = {
    Value: 'value',
    Somevalue: 'somevalue',
    Novalue: 'novalue'
} as const;
export type QualifierValueTypeEnum = typeof QualifierValueTypeEnum[keyof typeof QualifierValueTypeEnum];


/**
 * Check if a given object implements the QualifierValue interface.
 */
export function instanceOfQualifierValue(value: object): value is QualifierValue {
    return true;
}

export function QualifierValueFromJSON(json: any): QualifierValue {
    return QualifierValueFromJSONTyped(json, false);
}

export function QualifierValueFromJSONTyped(json: any, ignoreDiscriminator: boolean): QualifierValue {
    if (json == null) {
        return json;
    }
    return {
        
        'content': json['content'] == null ? undefined : json['content'],
        'type': json['type'] == null ? undefined : json['type'],
    };
}

export function QualifierValueToJSON(value?: QualifierValue | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'content': value['content'],
        'type': value['type'],
    };
}
