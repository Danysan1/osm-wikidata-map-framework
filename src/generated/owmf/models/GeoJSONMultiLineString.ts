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
 * @interface GeoJSONMultiLineString
 */
export interface GeoJSONMultiLineString {
    /**
     * the geometry type
     * @type {string}
     * @memberof GeoJSONMultiLineString
     */
    type: GeoJSONMultiLineStringTypeEnum;
    /**
     * 
     * @type {Array<Array<Array<number>>>}
     * @memberof GeoJSONMultiLineString
     */
    coordinates?: Array<Array<Array<number>>>;
}


/**
 * @export
 */
export const GeoJSONMultiLineStringTypeEnum = {
    Point: 'Point',
    LineString: 'LineString',
    Polygon: 'Polygon',
    MultiPoint: 'MultiPoint',
    MultiLineString: 'MultiLineString',
    MultiPolygon: 'MultiPolygon',
    GeometryCollection: 'GeometryCollection'
} as const;
export type GeoJSONMultiLineStringTypeEnum = typeof GeoJSONMultiLineStringTypeEnum[keyof typeof GeoJSONMultiLineStringTypeEnum];


/**
 * Check if a given object implements the GeoJSONMultiLineString interface.
 */
export function instanceOfGeoJSONMultiLineString(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "type" in value;

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
        
        'type': json['type'],
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
        
        'type': value.type,
        'coordinates': value.coordinates,
    };
}

