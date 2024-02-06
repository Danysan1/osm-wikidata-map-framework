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


import * as runtime from '../runtime';
import type {
  GetItem400Response,
} from '../models';
import {
    GetItem400ResponseFromJSON,
    GetItem400ResponseToJSON,
} from '../models';

export interface GetItemDescriptionRequest {
    itemId: string;
    languageCode: string;
    ifNoneMatch?: Array<string>;
    ifModifiedSince?: string;
    ifMatch?: Array<string>;
    ifUnmodifiedSince?: string;
    authorization?: string;
}

export interface GetItemDescriptionsRequest {
    itemId: string;
    ifNoneMatch?: Array<string>;
    ifModifiedSince?: string;
    ifMatch?: Array<string>;
    ifUnmodifiedSince?: string;
    authorization?: string;
}

export interface GetPropertyDescriptionRequest {
    propertyId: string;
    languageCode: string;
    ifNoneMatch?: Array<string>;
    ifModifiedSince?: string;
    ifMatch?: Array<string>;
    ifUnmodifiedSince?: string;
    authorization?: string;
}

export interface GetPropertyDescriptionsRequest {
    propertyId: string;
    ifNoneMatch?: Array<string>;
    ifModifiedSince?: string;
    ifMatch?: Array<string>;
    ifUnmodifiedSince?: string;
    authorization?: string;
}

/**
 * 
 */
export class DescriptionsApi extends runtime.BaseAPI {

    /**
     * Retrieve an Item\'s description in a specific language
     */
    async getItemDescriptionRaw(requestParameters: GetItemDescriptionRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<string>> {
        if (requestParameters.itemId === null || requestParameters.itemId === undefined) {
            throw new runtime.RequiredError('itemId','Required parameter requestParameters.itemId was null or undefined when calling getItemDescription.');
        }

        if (requestParameters.languageCode === null || requestParameters.languageCode === undefined) {
            throw new runtime.RequiredError('languageCode','Required parameter requestParameters.languageCode was null or undefined when calling getItemDescription.');
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        if (requestParameters.ifNoneMatch) {
            headerParameters['If-None-Match'] = requestParameters.ifNoneMatch.join(runtime.COLLECTION_FORMATS["csv"]);
        }

        if (requestParameters.ifModifiedSince !== undefined && requestParameters.ifModifiedSince !== null) {
            headerParameters['If-Modified-Since'] = String(requestParameters.ifModifiedSince);
        }

        if (requestParameters.ifMatch) {
            headerParameters['If-Match'] = requestParameters.ifMatch.join(runtime.COLLECTION_FORMATS["csv"]);
        }

        if (requestParameters.ifUnmodifiedSince !== undefined && requestParameters.ifUnmodifiedSince !== null) {
            headerParameters['If-Unmodified-Since'] = String(requestParameters.ifUnmodifiedSince);
        }

        if (requestParameters.authorization !== undefined && requestParameters.authorization !== null) {
            headerParameters['Authorization'] = String(requestParameters.authorization);
        }

        const response = await this.request({
            path: `/entities/items/{item_id}/descriptions/{language_code}`.replace(`{${"item_id"}}`, encodeURIComponent(String(requestParameters.itemId))).replace(`{${"language_code"}}`, encodeURIComponent(String(requestParameters.languageCode))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        if (this.isJsonMime(response.headers.get('content-type'))) {
            return new runtime.JSONApiResponse<string>(response);
        } else {
            return new runtime.TextApiResponse(response) as any;
        }
    }

    /**
     * Retrieve an Item\'s description in a specific language
     */
    async getItemDescription(requestParameters: GetItemDescriptionRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<string> {
        const response = await this.getItemDescriptionRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Retrieve an Item\'s descriptions
     */
    async getItemDescriptionsRaw(requestParameters: GetItemDescriptionsRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<{ [key: string]: string; }>> {
        if (requestParameters.itemId === null || requestParameters.itemId === undefined) {
            throw new runtime.RequiredError('itemId','Required parameter requestParameters.itemId was null or undefined when calling getItemDescriptions.');
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        if (requestParameters.ifNoneMatch) {
            headerParameters['If-None-Match'] = requestParameters.ifNoneMatch.join(runtime.COLLECTION_FORMATS["csv"]);
        }

        if (requestParameters.ifModifiedSince !== undefined && requestParameters.ifModifiedSince !== null) {
            headerParameters['If-Modified-Since'] = String(requestParameters.ifModifiedSince);
        }

        if (requestParameters.ifMatch) {
            headerParameters['If-Match'] = requestParameters.ifMatch.join(runtime.COLLECTION_FORMATS["csv"]);
        }

        if (requestParameters.ifUnmodifiedSince !== undefined && requestParameters.ifUnmodifiedSince !== null) {
            headerParameters['If-Unmodified-Since'] = String(requestParameters.ifUnmodifiedSince);
        }

        if (requestParameters.authorization !== undefined && requestParameters.authorization !== null) {
            headerParameters['Authorization'] = String(requestParameters.authorization);
        }

        const response = await this.request({
            path: `/entities/items/{item_id}/descriptions`.replace(`{${"item_id"}}`, encodeURIComponent(String(requestParameters.itemId))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse<any>(response);
    }

    /**
     * Retrieve an Item\'s descriptions
     */
    async getItemDescriptions(requestParameters: GetItemDescriptionsRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<{ [key: string]: string; }> {
        const response = await this.getItemDescriptionsRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Retrieve a Property\'s description in a specific language
     */
    async getPropertyDescriptionRaw(requestParameters: GetPropertyDescriptionRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<string>> {
        if (requestParameters.propertyId === null || requestParameters.propertyId === undefined) {
            throw new runtime.RequiredError('propertyId','Required parameter requestParameters.propertyId was null or undefined when calling getPropertyDescription.');
        }

        if (requestParameters.languageCode === null || requestParameters.languageCode === undefined) {
            throw new runtime.RequiredError('languageCode','Required parameter requestParameters.languageCode was null or undefined when calling getPropertyDescription.');
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        if (requestParameters.ifNoneMatch) {
            headerParameters['If-None-Match'] = requestParameters.ifNoneMatch.join(runtime.COLLECTION_FORMATS["csv"]);
        }

        if (requestParameters.ifModifiedSince !== undefined && requestParameters.ifModifiedSince !== null) {
            headerParameters['If-Modified-Since'] = String(requestParameters.ifModifiedSince);
        }

        if (requestParameters.ifMatch) {
            headerParameters['If-Match'] = requestParameters.ifMatch.join(runtime.COLLECTION_FORMATS["csv"]);
        }

        if (requestParameters.ifUnmodifiedSince !== undefined && requestParameters.ifUnmodifiedSince !== null) {
            headerParameters['If-Unmodified-Since'] = String(requestParameters.ifUnmodifiedSince);
        }

        if (requestParameters.authorization !== undefined && requestParameters.authorization !== null) {
            headerParameters['Authorization'] = String(requestParameters.authorization);
        }

        const response = await this.request({
            path: `/entities/properties/{property_id}/descriptions/{language_code}`.replace(`{${"property_id"}}`, encodeURIComponent(String(requestParameters.propertyId))).replace(`{${"language_code"}}`, encodeURIComponent(String(requestParameters.languageCode))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        if (this.isJsonMime(response.headers.get('content-type'))) {
            return new runtime.JSONApiResponse<string>(response);
        } else {
            return new runtime.TextApiResponse(response) as any;
        }
    }

    /**
     * Retrieve a Property\'s description in a specific language
     */
    async getPropertyDescription(requestParameters: GetPropertyDescriptionRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<string> {
        const response = await this.getPropertyDescriptionRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Retrieve a Property\'s descriptions
     */
    async getPropertyDescriptionsRaw(requestParameters: GetPropertyDescriptionsRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<{ [key: string]: string; }>> {
        if (requestParameters.propertyId === null || requestParameters.propertyId === undefined) {
            throw new runtime.RequiredError('propertyId','Required parameter requestParameters.propertyId was null or undefined when calling getPropertyDescriptions.');
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        if (requestParameters.ifNoneMatch) {
            headerParameters['If-None-Match'] = requestParameters.ifNoneMatch.join(runtime.COLLECTION_FORMATS["csv"]);
        }

        if (requestParameters.ifModifiedSince !== undefined && requestParameters.ifModifiedSince !== null) {
            headerParameters['If-Modified-Since'] = String(requestParameters.ifModifiedSince);
        }

        if (requestParameters.ifMatch) {
            headerParameters['If-Match'] = requestParameters.ifMatch.join(runtime.COLLECTION_FORMATS["csv"]);
        }

        if (requestParameters.ifUnmodifiedSince !== undefined && requestParameters.ifUnmodifiedSince !== null) {
            headerParameters['If-Unmodified-Since'] = String(requestParameters.ifUnmodifiedSince);
        }

        if (requestParameters.authorization !== undefined && requestParameters.authorization !== null) {
            headerParameters['Authorization'] = String(requestParameters.authorization);
        }

        const response = await this.request({
            path: `/entities/properties/{property_id}/descriptions`.replace(`{${"property_id"}}`, encodeURIComponent(String(requestParameters.propertyId))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse<any>(response);
    }

    /**
     * Retrieve a Property\'s descriptions
     */
    async getPropertyDescriptions(requestParameters: GetPropertyDescriptionsRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<{ [key: string]: string; }> {
        const response = await this.getPropertyDescriptionsRaw(requestParameters, initOverrides);
        return await response.value();
    }

}
