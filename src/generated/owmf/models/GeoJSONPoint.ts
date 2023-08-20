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
/**
 * GeoJSON geometry
 * @export
 * @interface GeoJSONPoint
 */
export interface GeoJSONPoint {
    /**
     * the geometry type
     * @type {string}
     * @memberof GeoJSONPoint
     */
    type: GeoJSONPointTypeEnum;
    /**
     * Point in 3D space
     * @type {Array<number>}
     * @memberof GeoJSONPoint
     */
    coordinates?: Array<number>;
}


/**
 * @export
 */
export const GeoJSONPointTypeEnum = {
    Point: 'Point',
    LineString: 'LineString',
    Polygon: 'Polygon',
    MultiPoint: 'MultiPoint',
    MultiLineString: 'MultiLineString',
    MultiPolygon: 'MultiPolygon'
} as const;
export type GeoJSONPointTypeEnum = typeof GeoJSONPointTypeEnum[keyof typeof GeoJSONPointTypeEnum];


/**
 * Check if a given object implements the GeoJSONPoint interface.
 */
export function instanceOfGeoJSONPoint(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "type" in value;

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
        
        'type': json['type'],
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
        
        'type': value.type,
        'coordinates': value.coordinates,
    };
}

