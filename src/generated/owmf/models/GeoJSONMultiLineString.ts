/* tslint:disable */
/* eslint-disable */
/**
 * OSM-Wikidata Map Framework API
 * Programmatically interact with a site based on OSM-Wikidata Map Framework
 *
 * The version of the OpenAPI document: 2.0.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { exists, mapValues } from '../runtime';
import type { GeoJSONGeometry } from './GeoJSONGeometry';
import {
    GeoJSONGeometryFromJSON,
    GeoJSONGeometryFromJSONTyped,
    GeoJSONGeometryToJSON,
} from './GeoJSONGeometry';

/**
 * GeoJSON geometry
 * @export
 * @interface GeoJSONMultiLineString
 */
export interface GeoJSONMultiLineString extends GeoJSONGeometry {
    /**
     * 
     * @type {Array<Array<Array<number>>>}
     * @memberof GeoJSONMultiLineString
     */
    coordinates?: Array<Array<Array<number>>>;
}



/**
 * Check if a given object implements the GeoJSONMultiLineString interface.
 */
export function instanceOfGeoJSONMultiLineString(value: object): boolean {
    let isInstance = true;

    return isInstance;
}

export function GeoJSONMultiLineStringFromJSON(json: any): GeoJSONMultiLineString {
    return GeoJSONMultiLineStringFromJSONTyped(json, false);
}

export function GeoJSONMultiLineStringFromJSONTyped(json: any, ignoreDiscriminator: boolean): GeoJSONMultiLineString {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        ...GeoJSONGeometryFromJSONTyped(json, ignoreDiscriminator),
        'coordinates': !exists(json, 'coordinates') ? undefined : json['coordinates'],
    };
}

export function GeoJSONMultiLineStringToJSON(value?: GeoJSONMultiLineString | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        ...GeoJSONGeometryToJSON(value),
        'coordinates': value.coordinates,
    };
}

