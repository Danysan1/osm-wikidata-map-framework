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
import type { EtymologyFeature } from './EtymologyFeature';
import {
    EtymologyFeatureFromJSON,
    EtymologyFeatureFromJSONTyped,
    EtymologyFeatureToJSON,
} from './EtymologyFeature';

/**
 * 
 * @export
 * @interface EtymologyResponseFeatures
 */
export interface EtymologyResponseFeatures {
    /**
     * 
     * @type {Array<EtymologyFeature>}
     * @memberof EtymologyResponseFeatures
     */
    features?: Array<EtymologyFeature>;
}

/**
 * Check if a given object implements the EtymologyResponseFeatures interface.
 */
export function instanceOfEtymologyResponseFeatures(value: object): boolean {
    let isInstance = true;

    return isInstance;
}

export function EtymologyResponseFeaturesFromJSON(json: any): EtymologyResponseFeatures {
    return EtymologyResponseFeaturesFromJSONTyped(json, false);
}

export function EtymologyResponseFeaturesFromJSONTyped(json: any, ignoreDiscriminator: boolean): EtymologyResponseFeatures {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'features': !exists(json, 'features') ? undefined : ((json['features'] as Array<any>).map(EtymologyFeatureFromJSON)),
    };
}

export function EtymologyResponseFeaturesToJSON(value?: EtymologyResponseFeatures | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'features': value.features === undefined ? undefined : ((value.features as Array<any>).map(EtymologyFeatureToJSON)),
    };
}

