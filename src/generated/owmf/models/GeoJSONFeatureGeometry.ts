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

import {
    GeoJSONLineString,
    instanceOfGeoJSONLineString,
    GeoJSONLineStringFromJSON,
    GeoJSONLineStringFromJSONTyped,
    GeoJSONLineStringToJSON,
} from './GeoJSONLineString';
import {
    GeoJSONMultiLineString,
    instanceOfGeoJSONMultiLineString,
    GeoJSONMultiLineStringFromJSON,
    GeoJSONMultiLineStringFromJSONTyped,
    GeoJSONMultiLineStringToJSON,
} from './GeoJSONMultiLineString';
import {
    GeoJSONMultiPoint,
    instanceOfGeoJSONMultiPoint,
    GeoJSONMultiPointFromJSON,
    GeoJSONMultiPointFromJSONTyped,
    GeoJSONMultiPointToJSON,
} from './GeoJSONMultiPoint';
import {
    GeoJSONMultiPolygon,
    instanceOfGeoJSONMultiPolygon,
    GeoJSONMultiPolygonFromJSON,
    GeoJSONMultiPolygonFromJSONTyped,
    GeoJSONMultiPolygonToJSON,
} from './GeoJSONMultiPolygon';
import {
    GeoJSONPoint,
    instanceOfGeoJSONPoint,
    GeoJSONPointFromJSON,
    GeoJSONPointFromJSONTyped,
    GeoJSONPointToJSON,
} from './GeoJSONPoint';
import {
    GeoJSONPolygon,
    instanceOfGeoJSONPolygon,
    GeoJSONPolygonFromJSON,
    GeoJSONPolygonFromJSONTyped,
    GeoJSONPolygonToJSON,
} from './GeoJSONPolygon';

/**
 * @type GeoJSONFeatureGeometry
 * 
 * @export
 */
export type GeoJSONFeatureGeometry = GeoJSONLineString | GeoJSONMultiLineString | GeoJSONMultiPoint | GeoJSONMultiPolygon | GeoJSONPoint | GeoJSONPolygon;

export function GeoJSONFeatureGeometryFromJSON(json: any): GeoJSONFeatureGeometry {
    return GeoJSONFeatureGeometryFromJSONTyped(json, false);
}

export function GeoJSONFeatureGeometryFromJSONTyped(json: any, ignoreDiscriminator: boolean): GeoJSONFeatureGeometry {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return GeoJSONLineStringFromJSONTyped(json, true) || GeoJSONMultiLineStringFromJSONTyped(json, true) || GeoJSONMultiPointFromJSONTyped(json, true) || GeoJSONMultiPolygonFromJSONTyped(json, true) || GeoJSONPointFromJSONTyped(json, true) || GeoJSONPolygonFromJSONTyped(json, true);
}

export function GeoJSONFeatureGeometryToJSON(value?: GeoJSONFeatureGeometry | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }

    if (instanceOfGeoJSONLineString(value)) {
        return GeoJSONLineStringToJSON(value as GeoJSONLineString);
    }
    if (instanceOfGeoJSONMultiLineString(value)) {
        return GeoJSONMultiLineStringToJSON(value as GeoJSONMultiLineString);
    }
    if (instanceOfGeoJSONMultiPoint(value)) {
        return GeoJSONMultiPointToJSON(value as GeoJSONMultiPoint);
    }
    if (instanceOfGeoJSONMultiPolygon(value)) {
        return GeoJSONMultiPolygonToJSON(value as GeoJSONMultiPolygon);
    }
    if (instanceOfGeoJSONPoint(value)) {
        return GeoJSONPointToJSON(value as GeoJSONPoint);
    }
    if (instanceOfGeoJSONPolygon(value)) {
        return GeoJSONPolygonToJSON(value as GeoJSONPolygon);
    }

    return {};
}

