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
import type { GeoJSONFeatureID } from './GeoJSONFeatureID';
import {
    GeoJSONFeatureIDFromJSON,
    GeoJSONFeatureIDFromJSONTyped,
    GeoJSONFeatureIDToJSON,
} from './GeoJSONFeatureID';
import type { GeoJSONPoint } from './GeoJSONPoint';
import {
    GeoJSONPointFromJSON,
    GeoJSONPointFromJSONTyped,
    GeoJSONPointToJSON,
} from './GeoJSONPoint';
import type { GlobalMapFeatureDetailsProperties } from './GlobalMapFeatureDetailsProperties';
import {
    GlobalMapFeatureDetailsPropertiesFromJSON,
    GlobalMapFeatureDetailsPropertiesFromJSONTyped,
    GlobalMapFeatureDetailsPropertiesToJSON,
} from './GlobalMapFeatureDetailsProperties';

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
     * @type {GeoJSONFeatureID}
     * @memberof GlobalMapFeature
     */
    id?: GeoJSONFeatureID;
    /**
     * 
     * @type {GeoJSONPoint}
     * @memberof GlobalMapFeature
     */
    geometry: GeoJSONPoint;
    /**
     * 2D/3D bounding box of the feature[s], in the order minLon,minLat,maxLon,maxLat[,minAlt,maxAlt]
     * @type {Array<number>}
     * @memberof GlobalMapFeature
     */
    bbox?: Array<number>;
    /**
     * 
     * @type {GlobalMapFeatureDetailsProperties}
     * @memberof GlobalMapFeature
     */
    properties?: GlobalMapFeatureDetailsProperties;
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
        'id': !exists(json, 'id') ? undefined : GeoJSONFeatureIDFromJSON(json['id']),
        'geometry': GeoJSONPointFromJSON(json['geometry']),
        'bbox': !exists(json, 'bbox') ? undefined : json['bbox'],
        'properties': !exists(json, 'properties') ? undefined : GlobalMapFeatureDetailsPropertiesFromJSON(json['properties']),
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
        'id': GeoJSONFeatureIDToJSON(value.id),
        'geometry': GeoJSONPointToJSON(value.geometry),
        'bbox': value.bbox,
        'properties': GlobalMapFeatureDetailsPropertiesToJSON(value.properties),
    };
}

