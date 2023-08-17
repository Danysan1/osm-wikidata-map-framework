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
/**
 * 
 * @export
 * @interface Etymology
 */
export interface Etymology {
    /**
     * Q-ID of the referenced Wikidata entity
     * @type {string}
     * @memberof Etymology
     */
    wikidata: string;
    /**
     * 
     * @type {boolean}
     * @memberof Etymology
     */
    fromOsm?: boolean;
    /**
     * 
     * @type {string}
     * @memberof Etymology
     */
    fromOsmType?: string;
    /**
     * 
     * @type {number}
     * @memberof Etymology
     */
    fromOsmId?: number;
    /**
     * 
     * @type {boolean}
     * @memberof Etymology
     */
    fromWikidata?: boolean;
    /**
     * Q-ID of the source Wikidata entity
     * @type {string}
     * @memberof Etymology
     */
    fromWikidataEntity?: string;
    /**
     * P-ID of the source Wikidata property
     * @type {string}
     * @memberof Etymology
     */
    fromWikidataProp?: string;
    /**
     * Q-ID of the Wikidata element representing the class this element is instance of
     * @type {string}
     * @memberof Etymology
     */
    instanceID?: string;
    /**
     * Q-ID of the Wikidata element representing the gender of this element
     * @type {string}
     * @memberof Etymology
     */
    genderID?: string;
    /**
     * Q-ID of the Wikidata element representing the country of this element
     * @type {string}
     * @memberof Etymology
     */
    countryID?: string;
    /**
     * Start date of this item
     * @type {string}
     * @memberof Etymology
     */
    startDate?: string;
    /**
     * End date of this item
     * @type {string}
     * @memberof Etymology
     */
    endDate?: string;
    /**
     * Birth date of this item
     * @type {string}
     * @memberof Etymology
     */
    birthDate?: string;
    /**
     * Death date of this item
     * @type {string}
     * @memberof Etymology
     */
    deathDate?: string;
    /**
     * Point in time where this event happened
     * @type {string}
     * @memberof Etymology
     */
    eventDate?: string;
}

/**
 * Check if a given object implements the Etymology interface.
 */
export function instanceOfEtymology(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "wikidata" in value;

    return isInstance;
}

export function EtymologyFromJSON(json: any): Etymology {
    return EtymologyFromJSONTyped(json, false);
}

export function EtymologyFromJSONTyped(json: any, ignoreDiscriminator: boolean): Etymology {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'wikidata': json['wikidata'],
        'fromOsm': !exists(json, 'from_osm') ? undefined : json['from_osm'],
        'fromOsmType': !exists(json, 'from_osm_type') ? undefined : json['from_osm_type'],
        'fromOsmId': !exists(json, 'from_osm_id') ? undefined : json['from_osm_id'],
        'fromWikidata': !exists(json, 'from_wikidata') ? undefined : json['from_wikidata'],
        'fromWikidataEntity': !exists(json, 'from_wikidata_entity') ? undefined : json['from_wikidata_entity'],
        'fromWikidataProp': !exists(json, 'from_wikidata_prop') ? undefined : json['from_wikidata_prop'],
        'instanceID': !exists(json, 'instanceID') ? undefined : json['instanceID'],
        'genderID': !exists(json, 'genderID') ? undefined : json['genderID'],
        'countryID': !exists(json, 'countryID') ? undefined : json['countryID'],
        'startDate': !exists(json, 'start_date') ? undefined : json['start_date'],
        'endDate': !exists(json, 'end_date') ? undefined : json['end_date'],
        'birthDate': !exists(json, 'birth_date') ? undefined : json['birth_date'],
        'deathDate': !exists(json, 'death_date') ? undefined : json['death_date'],
        'eventDate': !exists(json, 'event_date') ? undefined : json['event_date'],
    };
}

export function EtymologyToJSON(value?: Etymology | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'wikidata': value.wikidata,
        'from_osm': value.fromOsm,
        'from_osm_type': value.fromOsmType,
        'from_osm_id': value.fromOsmId,
        'from_wikidata': value.fromWikidata,
        'from_wikidata_entity': value.fromWikidataEntity,
        'from_wikidata_prop': value.fromWikidataProp,
        'instanceID': value.instanceID,
        'genderID': value.genderID,
        'countryID': value.countryID,
        'start_date': value.startDate,
        'end_date': value.endDate,
        'birth_date': value.birthDate,
        'death_date': value.deathDate,
        'event_date': value.eventDate,
    };
}

