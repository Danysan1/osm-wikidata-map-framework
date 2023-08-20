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
import type { GeoJSONGeometryCollection } from './GeoJSONGeometryCollection';
import {
    GeoJSONGeometryCollectionFromJSON,
    GeoJSONGeometryCollectionFromJSONTyped,
    GeoJSONGeometryCollectionToJSON,
} from './GeoJSONGeometryCollection';

/**
 * GeoJSON Feature
 * @export
 * @interface GeoJSONFeature
 */
export interface GeoJSONFeature {
    /**
     * 
     * @type {string}
     * @memberof GeoJSONFeature
     */
    type: GeoJSONFeatureTypeEnum;
    /**
     * 
     * @type {number}
     * @memberof GeoJSONFeature
     */
    id: number;
    /**
     * 
     * @type {GeoJSONGeometryCollection}
     * @memberof GeoJSONFeature
     */
    geometry: GeoJSONGeometryCollection;
    /**
     * Bounding box of the features
     * @type {Array<number>}
     * @memberof GeoJSONFeature
     */
    bbox?: Array<number>;
}


/**
 * @export
 */
export const GeoJSONFeatureTypeEnum = {
    Feature: 'Feature'
} as const;
export type GeoJSONFeatureTypeEnum = typeof GeoJSONFeatureTypeEnum[keyof typeof GeoJSONFeatureTypeEnum];


/**
 * Check if a given object implements the GeoJSONFeature interface.
 */
export function instanceOfGeoJSONFeature(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "type" in value;
    isInstance = isInstance && "id" in value;
    isInstance = isInstance && "geometry" in value;

    return isInstance;
}

export function GeoJSONFeatureFromJSON(json: any): GeoJSONFeature {
    return GeoJSONFeatureFromJSONTyped(json, false);
}

export function GeoJSONFeatureFromJSONTyped(json: any, ignoreDiscriminator: boolean): GeoJSONFeature {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'type': json['type'],
        'id': json['id'],
        'geometry': GeoJSONGeometryCollectionFromJSON(json['geometry']),
        'bbox': !exists(json, 'bbox') ? undefined : json['bbox'],
    };
}

export function GeoJSONFeatureToJSON(value?: GeoJSONFeature | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'type': value.type,
        'id': value.id,
        'geometry': GeoJSONGeometryCollectionToJSON(value.geometry),
        'bbox': value.bbox,
    };
}

