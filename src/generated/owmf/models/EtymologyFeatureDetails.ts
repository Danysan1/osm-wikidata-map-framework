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
    geometry: GeoJSONGeometry;
    /**
     * 
     * @type {EtymologyFeatureProperties}
     * @memberof EtymologyFeatureDetails
     */
    properties: EtymologyFeatureProperties | null;
}

/**
 * Check if a given object implements the EtymologyFeatureDetails interface.
 */
export function instanceOfEtymologyFeatureDetails(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "geometry" in value;
    isInstance = isInstance && "properties" in value;

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
        
        'geometry': GeoJSONGeometryFromJSON(json['geometry']),
        'properties': EtymologyFeaturePropertiesFromJSON(json['properties']),
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
        'properties': EtymologyFeaturePropertiesToJSON(value.properties),
    };
}

