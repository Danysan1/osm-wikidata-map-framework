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
import type { GeoJSONPoint } from './GeoJSONPoint';
import {
    GeoJSONPointFromJSON,
    GeoJSONPointFromJSONTyped,
    GeoJSONPointToJSON,
} from './GeoJSONPoint';

/**
 * 
 * @export
 * @interface ElementFeature
 */
export interface ElementFeature {
    /**
     * 
     * @type {string}
     * @memberof ElementFeature
     */
    type: ElementFeatureTypeEnum;
    /**
     * 
     * @type {string}
     * @memberof ElementFeature
     */
    id?: string;
    /**
     * 
     * @type {GeoJSONPoint}
     * @memberof ElementFeature
     */
    geometry: GeoJSONPoint;
    /**
     * 2D/3D bounding box of the feature[s], in the order minLon,minLat,maxLon,maxLat[,minAlt,maxAlt]
     * @type {Array<number>}
     * @memberof ElementFeature
     */
    bbox?: Array<number>;
}


/**
 * @export
 */
export const ElementFeatureTypeEnum = {
    Feature: 'Feature'
} as const;
export type ElementFeatureTypeEnum = typeof ElementFeatureTypeEnum[keyof typeof ElementFeatureTypeEnum];


/**
 * Check if a given object implements the ElementFeature interface.
 */
export function instanceOfElementFeature(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "type" in value;
    isInstance = isInstance && "geometry" in value;

    return isInstance;
}

export function ElementFeatureFromJSON(json: any): ElementFeature {
    return ElementFeatureFromJSONTyped(json, false);
}

export function ElementFeatureFromJSONTyped(json: any, ignoreDiscriminator: boolean): ElementFeature {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'type': json['type'],
        'id': !exists(json, 'id') ? undefined : json['id'],
        'geometry': GeoJSONPointFromJSON(json['geometry']),
        'bbox': !exists(json, 'bbox') ? undefined : json['bbox'],
    };
}

export function ElementFeatureToJSON(value?: ElementFeature | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'type': value.type,
        'id': value.id,
        'geometry': GeoJSONPointToJSON(value.geometry),
        'bbox': value.bbox,
    };
}

