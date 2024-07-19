/* tslint:disable */
/* eslint-disable */
/**
 * Wikibase REST API
 * OpenAPI definition of Wikibase REST API
 *
 * The version of the OpenAPI document: 0.4
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


import type {
    AddItemRequest,
    Item,
    ItemPatchBaseSchema
} from '../models/index';
import {
    AddItemRequestToJSON,
    ItemFromJSON,
    ItemPatchBaseSchemaToJSON
} from '../models/index';
import * as runtime from '../runtime';

export interface AddItemOperationRequest {
    addItemRequest: AddItemRequest;
    authorization?: string;
}

export interface GetItemRequest {
    itemId: string;
    fields?: Array<GetItemFieldsEnum>;
    ifNoneMatch?: Array<string>;
    ifModifiedSince?: string;
    ifMatch?: Array<string>;
    ifUnmodifiedSince?: string;
    authorization?: string;
}

export interface PatchItemOperationRequest {
    itemId: string;
    itemPatchBaseSchema: ItemPatchBaseSchema;
    ifMatch?: Array<string>;
    ifNoneMatch?: Array<string>;
    ifUnmodifiedSince?: string;
}

/**
 * 
 */
export class ItemsApi extends runtime.BaseAPI {

    /**
     * Create a Wikibase Item
     */
    async addItemRaw(requestParameters: AddItemOperationRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Item & object>> {
        if (requestParameters['addItemRequest'] == null) {
            throw new runtime.RequiredError(
                'addItemRequest',
                'Required parameter "addItemRequest" was null or undefined when calling addItem().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (requestParameters['authorization'] != null) {
            headerParameters['Authorization'] = String(requestParameters['authorization']);
        }

        const response = await this.request({
            path: `/entities/items`,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: AddItemRequestToJSON(requestParameters['addItemRequest']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => ItemFromJSON(jsonValue));
    }

    /**
     * Create a Wikibase Item
     */
    async addItem(requestParameters: AddItemOperationRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Item & object> {
        const response = await this.addItemRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Retrieve a single Wikibase Item by ID
     */
    async getItemRaw(requestParameters: GetItemRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Item & object>> {
        if (requestParameters['itemId'] == null) {
            throw new runtime.RequiredError(
                'itemId',
                'Required parameter "itemId" was null or undefined when calling getItem().'
            );
        }

        const queryParameters: any = {};

        if (requestParameters['fields'] != null) {
            queryParameters['_fields'] = requestParameters['fields']!.join(runtime.COLLECTION_FORMATS["csv"]);
        }

        const headerParameters: runtime.HTTPHeaders = {};

        if (requestParameters['ifNoneMatch'] != null) {
            headerParameters['If-None-Match'] = requestParameters['ifNoneMatch']!.join(runtime.COLLECTION_FORMATS["csv"]);
        }

        if (requestParameters['ifModifiedSince'] != null) {
            headerParameters['If-Modified-Since'] = String(requestParameters['ifModifiedSince']);
        }

        if (requestParameters['ifMatch'] != null) {
            headerParameters['If-Match'] = requestParameters['ifMatch']!.join(runtime.COLLECTION_FORMATS["csv"]);
        }

        if (requestParameters['ifUnmodifiedSince'] != null) {
            headerParameters['If-Unmodified-Since'] = String(requestParameters['ifUnmodifiedSince']);
        }

        if (requestParameters['authorization'] != null) {
            headerParameters['Authorization'] = String(requestParameters['authorization']);
        }

        const response = await this.request({
            path: `/entities/items/{item_id}`.replace(`{${"item_id"}}`, encodeURIComponent(String(requestParameters['itemId']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => ItemFromJSON(jsonValue));
    }

    /**
     * Retrieve a single Wikibase Item by ID
     */
    async getItem(requestParameters: GetItemRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Item & object> {
        const response = await this.getItemRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Change a single Wikibase Item by ID
     */
    async patchItemRaw(requestParameters: PatchItemOperationRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Item & object>> {
        if (requestParameters['itemId'] == null) {
            throw new runtime.RequiredError(
                'itemId',
                'Required parameter "itemId" was null or undefined when calling patchItem().'
            );
        }

        if (requestParameters['itemPatchBaseSchema'] == null) {
            throw new runtime.RequiredError(
                'itemPatchBaseSchema',
                'Required parameter "itemPatchBaseSchema" was null or undefined when calling patchItem().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json-patch+json';

        if (requestParameters['ifMatch'] != null) {
            headerParameters['If-Match'] = requestParameters['ifMatch']!.join(runtime.COLLECTION_FORMATS["csv"]);
        }

        if (requestParameters['ifNoneMatch'] != null) {
            headerParameters['If-None-Match'] = requestParameters['ifNoneMatch']!.join(runtime.COLLECTION_FORMATS["csv"]);
        }

        if (requestParameters['ifUnmodifiedSince'] != null) {
            headerParameters['If-Unmodified-Since'] = String(requestParameters['ifUnmodifiedSince']);
        }

        const response = await this.request({
            path: `/entities/items/{item_id}`.replace(`{${"item_id"}}`, encodeURIComponent(String(requestParameters['itemId']))),
            method: 'PATCH',
            headers: headerParameters,
            query: queryParameters,
            body: ItemPatchBaseSchemaToJSON(requestParameters['itemPatchBaseSchema']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => ItemFromJSON(jsonValue));
    }

    /**
     * Change a single Wikibase Item by ID
     */
    async patchItem(requestParameters: PatchItemOperationRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Item & object> {
        const response = await this.patchItemRaw(requestParameters, initOverrides);
        return await response.value();
    }

}

/**
 * @export
 */
export const GetItemFieldsEnum = {
    Type: 'type',
    Labels: 'labels',
    Descriptions: 'descriptions',
    Aliases: 'aliases',
    Statements: 'statements',
    Sitelinks: 'sitelinks'
} as const;
export type GetItemFieldsEnum = typeof GetItemFieldsEnum[keyof typeof GetItemFieldsEnum];
