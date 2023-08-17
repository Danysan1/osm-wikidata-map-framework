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
import type { Array<Etymology> | string } from './Array&lt;Etymology&gt; | string';
import {
    Array&lt;Etymology&gt; | stringFromJSON,
    Array&lt;Etymology&gt; | stringFromJSONTyped,
    Array&lt;Etymology&gt; | stringToJSON,
} from './Array&lt;Etymology&gt; | string';

/**
 * 
 * @export
 * @interface EtymologyFeatureProperties
 */
export interface EtymologyFeatureProperties {
    /**
     * 
     * @type {string}
     * @memberof EtymologyFeatureProperties
     */
    country_color?: string;
    /**
     * 
     * @type {string}
     * @memberof EtymologyFeatureProperties
     */
    alt_name?: string;
    /**
     * 
     * @type {string}
     * @memberof EtymologyFeatureProperties
     */
    commons?: string;
    /**
     * 
     * @type {number}
     * @memberof EtymologyFeatureProperties
     */
    el_id?: number;
    /**
     * 
     * @type {string}
     * @memberof EtymologyFeatureProperties
     */
    end_century_color?: string;
    /**
     * 
     * @type {Array<Etymology> | string}
     * @memberof EtymologyFeatureProperties
     */
    etymologies: Array<Etymology> | string | null;
    /**
     * 
     * @type {boolean}
     * @memberof EtymologyFeatureProperties
     */
    from_osm?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof EtymologyFeatureProperties
     */
    from_wikidata?: boolean;
    /**
     * 
     * @type {string}
     * @memberof EtymologyFeatureProperties
     */
    gender_color?: string;
    /**
     * 
     * @type {string}
     * @memberof EtymologyFeatureProperties
     */
    name: string;
    /**
     * 
     * @type {string}
     * @memberof EtymologyFeatureProperties
     */
    official_name?: string;
    /**
     * 
     * @type {string}
     * @memberof EtymologyFeatureProperties
     */
    osm_type?: string;
    /**
     * 
     * @type {number}
     * @memberof EtymologyFeatureProperties
     */
    osm_id?: number;
    /**
     * 
     * @type {string}
     * @memberof EtymologyFeatureProperties
     */
    picture?: string;
    /**
     * 
     * @type {string}
     * @memberof EtymologyFeatureProperties
     */
    source_color?: string;
    /**
     * 
     * @type {string}
     * @memberof EtymologyFeatureProperties
     */
    start_century_color?: string;
    /**
     * 
     * @type {string}
     * @memberof EtymologyFeatureProperties
     */
    text_etymology?: string;
    /**
     * 
     * @type {string}
     * @memberof EtymologyFeatureProperties
     */
    text_etymology_descr?: string;
    /**
     * 
     * @type {string}
     * @memberof EtymologyFeatureProperties
     */
    type_color?: string;
    /**
     * Q-ID of the Wikidata entity for this feature
     * @type {string}
     * @memberof EtymologyFeatureProperties
     */
    wikidata?: string;
    /**
     * 
     * @type {string}
     * @memberof EtymologyFeatureProperties
     */
    wikipedia?: string;
}

/**
 * Check if a given object implements the EtymologyFeatureProperties interface.
 */
export function instanceOfEtymologyFeatureProperties(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "etymologies" in value;
    isInstance = isInstance && "name" in value;

    return isInstance;
}

export function EtymologyFeaturePropertiesFromJSON(json: any): EtymologyFeatureProperties {
    return EtymologyFeaturePropertiesFromJSONTyped(json, false);
}

export function EtymologyFeaturePropertiesFromJSONTyped(json: any, ignoreDiscriminator: boolean): EtymologyFeatureProperties {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'country_color': !exists(json, 'country_color') ? undefined : json['country_color'],
        'alt_name': !exists(json, 'alt_name') ? undefined : json['alt_name'],
        'commons': !exists(json, 'commons') ? undefined : json['commons'],
        'el_id': !exists(json, 'el_id') ? undefined : json['el_id'],
        'end_century_color': !exists(json, 'end_century_color') ? undefined : json['end_century_color'],
        'etymologies': Array&lt;Etymology&gt; | stringFromJSON(json['etymologies']),
        'from_osm': !exists(json, 'from_osm') ? undefined : json['from_osm'],
        'from_wikidata': !exists(json, 'from_wikidata') ? undefined : json['from_wikidata'],
        'gender_color': !exists(json, 'gender_color') ? undefined : json['gender_color'],
        'name': json['name'],
        'official_name': !exists(json, 'official_name') ? undefined : json['official_name'],
        'osm_type': !exists(json, 'osm_type') ? undefined : json['osm_type'],
        'osm_id': !exists(json, 'osm_id') ? undefined : json['osm_id'],
        'picture': !exists(json, 'picture') ? undefined : json['picture'],
        'source_color': !exists(json, 'source_color') ? undefined : json['source_color'],
        'start_century_color': !exists(json, 'start_century_color') ? undefined : json['start_century_color'],
        'text_etymology': !exists(json, 'text_etymology') ? undefined : json['text_etymology'],
        'text_etymology_descr': !exists(json, 'text_etymology_descr') ? undefined : json['text_etymology_descr'],
        'type_color': !exists(json, 'type_color') ? undefined : json['type_color'],
        'wikidata': !exists(json, 'wikidata') ? undefined : json['wikidata'],
        'wikipedia': !exists(json, 'wikipedia') ? undefined : json['wikipedia'],
    };
}

export function EtymologyFeaturePropertiesToJSON(value?: EtymologyFeatureProperties | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'country_color': value.country_color,
        'alt_name': value.alt_name,
        'commons': value.commons,
        'el_id': value.el_id,
        'end_century_color': value.end_century_color,
        'etymologies': Array&lt;Etymology&gt; | stringToJSON(value.etymologies),
        'from_osm': value.from_osm,
        'from_wikidata': value.from_wikidata,
        'gender_color': value.gender_color,
        'name': value.name,
        'official_name': value.official_name,
        'osm_type': value.osm_type,
        'osm_id': value.osm_id,
        'picture': value.picture,
        'source_color': value.source_color,
        'start_century_color': value.start_century_color,
        'text_etymology': value.text_etymology,
        'text_etymology_descr': value.text_etymology_descr,
        'type_color': value.type_color,
        'wikidata': value.wikidata,
        'wikipedia': value.wikipedia,
    };
}

