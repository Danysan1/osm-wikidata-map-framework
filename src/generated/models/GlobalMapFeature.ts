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
import type { GeoJSONPoint } from './GeoJSONPoint';
import {
    GeoJSONPointFromJSON,
    GeoJSONPointFromJSONTyped,
    GeoJSONPointToJSON,
} from './GeoJSONPoint';
import type { GlobalMapFeatureAllOfProperties } from './GlobalMapFeatureAllOfProperties';
import {
    GlobalMapFeatureAllOfPropertiesFromJSON,
    GlobalMapFeatureAllOfPropertiesFromJSONTyped,
    GlobalMapFeatureAllOfPropertiesToJSON,
} from './GlobalMapFeatureAllOfProperties';

/**
 * 
 * @export
 * @interface GlobalMapFeature
 */
export interface GlobalMapFeature {
    /**
     * 
     * @type {string}
     * @memberof GlobalMapFeature
     */
    type: GlobalMapFeatureTypeEnum;
    /**
     * 
     * @type {number}
     * @memberof GlobalMapFeature
     */
    id: number;
    /**
     * 
     * @type {GeoJSONPoint}
     * @memberof GlobalMapFeature
     */
    geometry: GeoJSONPoint;
    /**
     * Bounding box of the features
     * @type {Array<number>}
     * @memberof GlobalMapFeature
     */
    bbox?: Array<number>;
    /**
     * 
     * @type {GlobalMapFeatureAllOfProperties}
     * @memberof GlobalMapFeature
     */
    properties?: GlobalMapFeatureAllOfProperties;
}


/**
 * @export
 */
export const GlobalMapFeatureTypeEnum = {
    Feature: 'Feature'
} as const;
export type GlobalMapFeatureTypeEnum = typeof GlobalMapFeatureTypeEnum[keyof typeof GlobalMapFeatureTypeEnum];


/**
 * Check if a given object implements the GlobalMapFeature interface.
 */
export function instanceOfGlobalMapFeature(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "type" in value;
    isInstance = isInstance && "id" in value;
    isInstance = isInstance && "geometry" in value;

    return isInstance;
}

export function GlobalMapFeatureFromJSON(json: any): GlobalMapFeature {
    return GlobalMapFeatureFromJSONTyped(json, false);
}

export function GlobalMapFeatureFromJSONTyped(json: any, ignoreDiscriminator: boolean): GlobalMapFeature {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'type': json['type'],
        'id': json['id'],
        'geometry': GeoJSONPointFromJSON(json['geometry']),
        'bbox': !exists(json, 'bbox') ? undefined : json['bbox'],
        'properties': !exists(json, 'properties') ? undefined : GlobalMapFeatureAllOfPropertiesFromJSON(json['properties']),
    };
}

export function GlobalMapFeatureToJSON(value?: GlobalMapFeature | null): any {
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
        'properties': GlobalMapFeatureAllOfPropertiesToJSON(value.properties),
    };
}

