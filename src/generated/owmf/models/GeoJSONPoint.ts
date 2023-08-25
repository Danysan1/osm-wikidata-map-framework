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
 * @interface GeoJSONPoint
 */
export interface GeoJSONPoint extends GeoJSONGeometry {
    /**
     * Point in 3D space
     * @type {Array<number>}
     * @memberof GeoJSONPoint
     */
    coordinates?: Array<number>;
}



/**
 * Check if a given object implements the GeoJSONPoint interface.
 */
export function instanceOfGeoJSONPoint(value: object): boolean {
    let isInstance = true;

    return isInstance;
}

export function GeoJSONPointFromJSON(json: any): GeoJSONPoint {
    return GeoJSONPointFromJSONTyped(json, false);
}

export function GeoJSONPointFromJSONTyped(json: any, ignoreDiscriminator: boolean): GeoJSONPoint {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        ...GeoJSONGeometryFromJSONTyped(json, ignoreDiscriminator),
        'coordinates': !exists(json, 'coordinates') ? undefined : json['coordinates'],
    };
}

export function GeoJSONPointToJSON(value?: GeoJSONPoint | null): any {
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

