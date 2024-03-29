/* tslint:disable */
/* eslint-disable */
/**
 * Overpass API
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
import type { OverpassElement } from './OverpassElement';
import {
    OverpassElementFromJSON,
    OverpassElementFromJSONTyped,
    OverpassElementToJSON,
} from './OverpassElement';

/**
 * 
 * @export
 * @interface OverpassQueryResponse
 */
export interface OverpassQueryResponse {
    /**
     * The version of the Overpass API
     * @type {number}
     * @memberof OverpassQueryResponse
     */
    version?: number;
    /**
     * The name of the Overpass API
     * @type {string}
     * @memberof OverpassQueryResponse
     */
    generator?: string;
    /**
     * The details of the OSM3S API
     * @type {{ [key: string]: string; }}
     * @memberof OverpassQueryResponse
     */
    osm3s?: { [key: string]: string; };
    /**
     * A remark about problems encountered the query
     * @type {string}
     * @memberof OverpassQueryResponse
     */
    remark?: string;
    /**
     * The elements returned by the query
     * @type {Array<OverpassElement>}
     * @memberof OverpassQueryResponse
     */
    elements?: Array<OverpassElement>;
}

/**
 * Check if a given object implements the OverpassQueryResponse interface.
 */
export function instanceOfOverpassQueryResponse(value: object): boolean {
    let isInstance = true;

    return isInstance;
}

export function OverpassQueryResponseFromJSON(json: any): OverpassQueryResponse {
    return OverpassQueryResponseFromJSONTyped(json, false);
}

export function OverpassQueryResponseFromJSONTyped(json: any, ignoreDiscriminator: boolean): OverpassQueryResponse {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'version': !exists(json, 'version') ? undefined : json['version'],
        'generator': !exists(json, 'generator') ? undefined : json['generator'],
        'osm3s': !exists(json, 'osm3s') ? undefined : json['osm3s'],
        'remark': !exists(json, 'remark') ? undefined : json['remark'],
        'elements': !exists(json, 'elements') ? undefined : ((json['elements'] as Array<any>).map(OverpassElementFromJSON)),
    };
}

export function OverpassQueryResponseToJSON(value?: OverpassQueryResponse | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'version': value.version,
        'generator': value.generator,
        'osm3s': value.osm3s,
        'remark': value.remark,
        'elements': value.elements === undefined ? undefined : ((value.elements as Array<any>).map(OverpassElementToJSON)),
    };
}

