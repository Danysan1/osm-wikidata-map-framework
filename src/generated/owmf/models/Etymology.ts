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
/**
 * 
 * @export
 * @interface Etymology
 */
export interface Etymology {
    /**
     * Internal ID for the etymology relationship (unique within the request but may vary after OWMF DB updates)
     * @type {number}
     * @memberof Etymology
     */
    et_id?: number;
    /**
     * Whether OpenStreetMap is the original source of this etymology
     * @type {boolean}
     * @memberof Etymology
     */
    from_osm?: boolean;
    /**
     * Type of the source OpenStreetMap element
     * @type {string}
     * @memberof Etymology
     */
    from_osm_type?: EtymologyFromOsmTypeEnum;
    /**
     * ID (unique only within its osm_type) of the source OpenStreetMap element
     * @type {number}
     * @memberof Etymology
     */
    from_osm_id?: number;
    /**
     * Whether Wikidata is the original source of this etymology
     * @type {boolean}
     * @memberof Etymology
     */
    from_wikidata?: boolean;
    /**
     * Q-ID of the source Wikidata entity this etymology has been extracted from
     * @type {string}
     * @memberof Etymology
     */
    from_wikidata_entity?: string;
    /**
     * P-ID of the Wikidata property that links from the source Wikidata entity to this etymology entity
     * @type {string}
     * @memberof Etymology
     */
    from_wikidata_prop?: string;
    /**
     * Q-ID of the etymology Wikidata entity that contained this entity, leading to the inclusion of this entity as well
     * @type {string}
     * @memberof Etymology
     */
    from_parts_of_wikidata_cod?: string;
    /**
     * Whether this etymology has been obtained through propagation
     * @type {boolean}
     * @memberof Etymology
     */
    propagated?: boolean;
    /**
     * Internal ID for this etymology Wikidata item (unique within the request but may vary after OWMF DB updates)
     * @type {number}
     * @memberof Etymology
     */
    wd_id?: number;
    /**
     * Q-ID of this etymology Wikidata item
     * @type {string}
     * @memberof Etymology
     */
    wikidata?: string;
}


/**
 * @export
 */
export const EtymologyFromOsmTypeEnum = {
    Node: 'node',
    Way: 'way',
    Relation: 'relation'
} as const;
export type EtymologyFromOsmTypeEnum = typeof EtymologyFromOsmTypeEnum[keyof typeof EtymologyFromOsmTypeEnum];


/**
 * Check if a given object implements the Etymology interface.
 */
export function instanceOfEtymology(value: object): boolean {
    let isInstance = true;

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
        
        'et_id': !exists(json, 'et_id') ? undefined : json['et_id'],
        'from_osm': !exists(json, 'from_osm') ? undefined : json['from_osm'],
        'from_osm_type': !exists(json, 'from_osm_type') ? undefined : json['from_osm_type'],
        'from_osm_id': !exists(json, 'from_osm_id') ? undefined : json['from_osm_id'],
        'from_wikidata': !exists(json, 'from_wikidata') ? undefined : json['from_wikidata'],
        'from_wikidata_entity': !exists(json, 'from_wikidata_entity') ? undefined : json['from_wikidata_entity'],
        'from_wikidata_prop': !exists(json, 'from_wikidata_prop') ? undefined : json['from_wikidata_prop'],
        'from_parts_of_wikidata_cod': !exists(json, 'from_parts_of_wikidata_cod') ? undefined : json['from_parts_of_wikidata_cod'],
        'propagated': !exists(json, 'propagated') ? undefined : json['propagated'],
        'wd_id': !exists(json, 'wd_id') ? undefined : json['wd_id'],
        'wikidata': !exists(json, 'wikidata') ? undefined : json['wikidata'],
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
        
        'et_id': value.et_id,
        'from_osm': value.from_osm,
        'from_osm_type': value.from_osm_type,
        'from_osm_id': value.from_osm_id,
        'from_wikidata': value.from_wikidata,
        'from_wikidata_entity': value.from_wikidata_entity,
        'from_wikidata_prop': value.from_wikidata_prop,
        'from_parts_of_wikidata_cod': value.from_parts_of_wikidata_cod,
        'propagated': value.propagated,
        'wd_id': value.wd_id,
        'wikidata': value.wikidata,
    };
}

