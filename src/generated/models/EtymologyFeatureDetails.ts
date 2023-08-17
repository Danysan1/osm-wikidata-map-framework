/* tslint:disable */
/* eslint-disable */
/**
 * OSM-Wikidata Map Framework API
 * Programmatically interact with a site based on OSM-Wikidata Map Framework
 *
 * The version of the OpenAPI document: 1.13.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { exists, mapValues } from '../runtime';
import type { EtymologyFeatureProperties } from './EtymologyFeatureProperties';
import {
    EtymologyFeaturePropertiesFromJSON,
    EtymologyFeaturePropertiesFromJSONTyped,
    EtymologyFeaturePropertiesToJSON,
} from './EtymologyFeatureProperties';
import type { GeoJSONGeometry } from './GeoJSONGeometry';
import {
    GeoJSONGeometryFromJSON,
    GeoJSONGeometryFromJSONTyped,
    GeoJSONGeometryToJSON,
} from './GeoJSONGeometry';

/**
 * 
 * @export
 * @interface EtymologyFeatureDetails
 */
export interface EtymologyFeatureDetails {
    /**
     * 
     * @type {GeoJSONGeometry}
     * @memberof EtymologyFeatureDetails
     */
    geometry?: GeoJSONGeometry;
    /**
     * 
     * @type {string}
     * @memberof EtymologyFeatureDetails
     */
    id?: string;
    /**
     * 
     * @type {EtymologyFeatureProperties}
     * @memberof EtymologyFeatureDetails
     */
    properties?: EtymologyFeatureProperties;
}

/**
 * Check if a given object implements the EtymologyFeatureDetails interface.
 */
export function instanceOfEtymologyFeatureDetails(value: object): boolean {
    let isInstance = true;

    return isInstance;
}

export function EtymologyFeatureDetailsFromJSON(json: any): EtymologyFeatureDetails {
    return EtymologyFeatureDetailsFromJSONTyped(json, false);
}

export function EtymologyFeatureDetailsFromJSONTyped(json: any, ignoreDiscriminator: boolean): EtymologyFeatureDetails {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'geometry': !exists(json, 'geometry') ? undefined : GeoJSONGeometryFromJSON(json['geometry']),
        'id': !exists(json, 'id') ? undefined : json['id'],
        'properties': !exists(json, 'properties') ? undefined : EtymologyFeaturePropertiesFromJSON(json['properties']),
    };
}

export function EtymologyFeatureDetailsToJSON(value?: EtymologyFeatureDetails | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'geometry': GeoJSONGeometryToJSON(value.geometry),
        'id': value.id,
        'properties': EtymologyFeaturePropertiesToJSON(value.properties),
    };
}

