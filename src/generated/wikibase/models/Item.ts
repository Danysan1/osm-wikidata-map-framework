/* tslint:disable */
/* eslint-disable */
/**
 * Wikibase REST API
 * OpenAPI definition of Wikibase REST API
 *
 * The version of the OpenAPI document: 0.1
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { exists, mapValues } from '../runtime';
import type { GetItem200ResponseAllOfSitelinksValue } from './GetItem200ResponseAllOfSitelinksValue';
import {
    GetItem200ResponseAllOfSitelinksValueFromJSON,
    GetItem200ResponseAllOfSitelinksValueFromJSONTyped,
    GetItem200ResponseAllOfSitelinksValueToJSON,
} from './GetItem200ResponseAllOfSitelinksValue';
import type { ItemStatementsValueInner } from './ItemStatementsValueInner';
import {
    ItemStatementsValueInnerFromJSON,
    ItemStatementsValueInnerFromJSONTyped,
    ItemStatementsValueInnerToJSON,
} from './ItemStatementsValueInner';

/**
 * 
 * @export
 * @interface Item
 */
export interface Item {
    /**
     * 
     * @type {string}
     * @memberof Item
     */
    id?: string;
    /**
     * 
     * @type {string}
     * @memberof Item
     */
    type?: string;
    /**
     * 
     * @type {any}
     * @memberof Item
     */
    labels?: any;
    /**
     * 
     * @type {any}
     * @memberof Item
     */
    descriptions?: any;
    /**
     * 
     * @type {any}
     * @memberof Item
     */
    aliases?: any;
    /**
     * 
     * @type {{ [key: string]: GetItem200ResponseAllOfSitelinksValue; }}
     * @memberof Item
     */
    sitelinks?: { [key: string]: GetItem200ResponseAllOfSitelinksValue; };
    /**
     * 
     * @type {{ [key: string]: Array<ItemStatementsValueInner>; }}
     * @memberof Item
     */
    statements?: { [key: string]: Array<ItemStatementsValueInner>; };
}

/**
 * Check if a given object implements the Item interface.
 */
export function instanceOfItem(value: object): boolean {
    let isInstance = true;

    return isInstance;
}

export function ItemFromJSON(json: any): Item {
    return ItemFromJSONTyped(json, false);
}

export function ItemFromJSONTyped(json: any, ignoreDiscriminator: boolean): Item {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'id': !exists(json, 'id') ? undefined : json['id'],
        'type': !exists(json, 'type') ? undefined : json['type'],
        'labels': !exists(json, 'labels') ? undefined : json['labels'],
        'descriptions': !exists(json, 'descriptions') ? undefined : json['descriptions'],
        'aliases': !exists(json, 'aliases') ? undefined : json['aliases'],
        'sitelinks': !exists(json, 'sitelinks') ? undefined : (mapValues(json['sitelinks'], GetItem200ResponseAllOfSitelinksValueFromJSON)),
        'statements': !exists(json, 'statements') ? undefined : json['statements'],
    };
}

export function ItemToJSON(value?: Item | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'id': value.id,
        'type': value.type,
        'labels': value.labels,
        'descriptions': value.descriptions,
        'aliases': value.aliases,
        'sitelinks': value.sitelinks === undefined ? undefined : (mapValues(value.sitelinks, GetItem200ResponseAllOfSitelinksValueToJSON)),
        'statements': value.statements,
    };
}

