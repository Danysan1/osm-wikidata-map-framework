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
 * @interface GeoJSONLineStringAllOf
 */
export interface GeoJSONLineStringAllOf {
    /**
     * 
     * @type {Array<Array<number>>}
     * @memberof GeoJSONLineStringAllOf
     */
    coordinates?: Array<Array<number>>;
}

/**
 * Check if a given object implements the GeoJSONLineStringAllOf interface.
 */
export function instanceOfGeoJSONLineStringAllOf(value: object): boolean {
    let isInstance = true;

    return isInstance;
}

export function GeoJSONLineStringAllOfFromJSON(json: any): GeoJSONLineStringAllOf {
    return GeoJSONLineStringAllOfFromJSONTyped(json, false);
}

export function GeoJSONLineStringAllOfFromJSONTyped(json: any, ignoreDiscriminator: boolean): GeoJSONLineStringAllOf {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'coordinates': !exists(json, 'coordinates') ? undefined : json['coordinates'],
    };
}

export function GeoJSONLineStringAllOfToJSON(value?: GeoJSONLineStringAllOf | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'coordinates': value.coordinates,
    };
}

