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


import * as runtime from '../runtime';
import type {
  AddItemAliasesInLanguageRequest,
  AliasesPatchSchema,
  ItemNotFoundSchema,
} from '../models/index';
import {
    AddItemAliasesInLanguageRequestFromJSON,
    AddItemAliasesInLanguageRequestToJSON,
    AliasesPatchSchemaFromJSON,
    AliasesPatchSchemaToJSON,
    ItemNotFoundSchemaFromJSON,
    ItemNotFoundSchemaToJSON,
} from '../models/index';

export interface AddItemAliasesInLanguageOperationRequest {
    itemId: string;
    languageCode: string;
    addItemAliasesInLanguageRequest: AddItemAliasesInLanguageRequest;
    ifNoneMatch?: Array<string>;
    ifModifiedSince?: string;
    ifMatch?: Array<string>;
    ifUnmodifiedSince?: string;
    authorization?: string;
}

export interface AddPropertyAliasesInLanguageRequest {
    propertyId: string;
    languageCode: string;
    addItemAliasesInLanguageRequest: AddItemAliasesInLanguageRequest;
    ifNoneMatch?: Array<string>;
    ifModifiedSince?: string;
    ifMatch?: Array<string>;
    ifUnmodifiedSince?: string;
    authorization?: string;
}

export interface GetItemAliasesRequest {
    itemId: string;
    ifNoneMatch?: Array<string>;
    ifModifiedSince?: string;
    ifMatch?: Array<string>;
    ifUnmodifiedSince?: string;
    authorization?: string;
}

export interface GetItemAliasesInLanguageRequest {
    itemId: string;
    languageCode: string;
    ifNoneMatch?: Array<string>;
    ifModifiedSince?: string;
    ifMatch?: Array<string>;
    ifUnmodifiedSince?: string;
    authorization?: string;
}

export interface GetPropertyAliasesRequest {
    propertyId: string;
    ifNoneMatch?: Array<string>;
    ifModifiedSince?: string;
    ifMatch?: Array<string>;
    ifUnmodifiedSince?: string;
    authorization?: string;
}

export interface GetPropertyAliasesInLanguageRequest {
    propertyId: string;
    languageCode: string;
    ifNoneMatch?: Array<string>;
    ifModifiedSince?: string;
    ifMatch?: Array<string>;
    ifUnmodifiedSince?: string;
    authorization?: string;
}

export interface PatchItemAliasesRequest {
    itemId: string;
    aliasesPatchSchema: AliasesPatchSchema;
    ifMatch?: Array<string>;
    ifNoneMatch?: Array<string>;
    ifUnmodifiedSince?: string;
}

export interface PatchPropertyAliasesRequest {
    propertyId: string;
    aliasesPatchSchema: AliasesPatchSchema;
    ifMatch?: Array<string>;
    ifNoneMatch?: Array<string>;
    ifUnmodifiedSince?: string;
}

/**
 * 
 */
export class AliasesApi extends runtime.BaseAPI {

    /**
     * Create / Add an Item\'s aliases in a specific language
     */
    async addItemAliasesInLanguageRaw(requestParameters: AddItemAliasesInLanguageOperationRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Array<string>>> {
        if (requestParameters['itemId'] == null) {
            throw new runtime.RequiredError(
                'itemId',
                'Required parameter "itemId" was null or undefined when calling addItemAliasesInLanguage().'
            );
        }

        if (requestParameters['languageCode'] == null) {
            throw new runtime.RequiredError(
                'languageCode',
                'Required parameter "languageCode" was null or undefined when calling addItemAliasesInLanguage().'
            );
        }

        if (requestParameters['addItemAliasesInLanguageRequest'] == null) {
            throw new runtime.RequiredError(
                'addItemAliasesInLanguageRequest',
                'Required parameter "addItemAliasesInLanguageRequest" was null or undefined when calling addItemAliasesInLanguage().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

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
            path: `/entities/items/{item_id}/aliases/{language_code}`.replace(`{${"item_id"}}`, encodeURIComponent(String(requestParameters['itemId']))).replace(`{${"language_code"}}`, encodeURIComponent(String(requestParameters['languageCode']))),
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: AddItemAliasesInLanguageRequestToJSON(requestParameters['addItemAliasesInLanguageRequest']),
        }, initOverrides);

        return new runtime.JSONApiResponse<any>(response);
    }

    /**
     * Create / Add an Item\'s aliases in a specific language
     */
    async addItemAliasesInLanguage(requestParameters: AddItemAliasesInLanguageOperationRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Array<string>> {
        const response = await this.addItemAliasesInLanguageRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Create / Add a Property\'s aliases in a specific language
     */
    async addPropertyAliasesInLanguageRaw(requestParameters: AddPropertyAliasesInLanguageRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Array<string>>> {
        if (requestParameters['propertyId'] == null) {
            throw new runtime.RequiredError(
                'propertyId',
                'Required parameter "propertyId" was null or undefined when calling addPropertyAliasesInLanguage().'
            );
        }

        if (requestParameters['languageCode'] == null) {
            throw new runtime.RequiredError(
                'languageCode',
                'Required parameter "languageCode" was null or undefined when calling addPropertyAliasesInLanguage().'
            );
        }

        if (requestParameters['addItemAliasesInLanguageRequest'] == null) {
            throw new runtime.RequiredError(
                'addItemAliasesInLanguageRequest',
                'Required parameter "addItemAliasesInLanguageRequest" was null or undefined when calling addPropertyAliasesInLanguage().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

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
            path: `/entities/properties/{property_id}/aliases/{language_code}`.replace(`{${"property_id"}}`, encodeURIComponent(String(requestParameters['propertyId']))).replace(`{${"language_code"}}`, encodeURIComponent(String(requestParameters['languageCode']))),
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: AddItemAliasesInLanguageRequestToJSON(requestParameters['addItemAliasesInLanguageRequest']),
        }, initOverrides);

        return new runtime.JSONApiResponse<any>(response);
    }

    /**
     * Create / Add a Property\'s aliases in a specific language
     */
    async addPropertyAliasesInLanguage(requestParameters: AddPropertyAliasesInLanguageRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Array<string>> {
        const response = await this.addPropertyAliasesInLanguageRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Retrieve an Item\'s aliases
     */
    async getItemAliasesRaw(requestParameters: GetItemAliasesRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<{ [key: string]: Array<string>; }>> {
        if (requestParameters['itemId'] == null) {
            throw new runtime.RequiredError(
                'itemId',
                'Required parameter "itemId" was null or undefined when calling getItemAliases().'
            );
        }

        const queryParameters: any = {};

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
            path: `/entities/items/{item_id}/aliases`.replace(`{${"item_id"}}`, encodeURIComponent(String(requestParameters['itemId']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse<any>(response);
    }

    /**
     * Retrieve an Item\'s aliases
     */
    async getItemAliases(requestParameters: GetItemAliasesRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<{ [key: string]: Array<string>; }> {
        const response = await this.getItemAliasesRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Retrieve an Item\'s aliases in a specific language
     */
    async getItemAliasesInLanguageRaw(requestParameters: GetItemAliasesInLanguageRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Array<string>>> {
        if (requestParameters['itemId'] == null) {
            throw new runtime.RequiredError(
                'itemId',
                'Required parameter "itemId" was null or undefined when calling getItemAliasesInLanguage().'
            );
        }

        if (requestParameters['languageCode'] == null) {
            throw new runtime.RequiredError(
                'languageCode',
                'Required parameter "languageCode" was null or undefined when calling getItemAliasesInLanguage().'
            );
        }

        const queryParameters: any = {};

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
            path: `/entities/items/{item_id}/aliases/{language_code}`.replace(`{${"item_id"}}`, encodeURIComponent(String(requestParameters['itemId']))).replace(`{${"language_code"}}`, encodeURIComponent(String(requestParameters['languageCode']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse<any>(response);
    }

    /**
     * Retrieve an Item\'s aliases in a specific language
     */
    async getItemAliasesInLanguage(requestParameters: GetItemAliasesInLanguageRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Array<string>> {
        const response = await this.getItemAliasesInLanguageRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Retrieve a Property\'s aliases
     */
    async getPropertyAliasesRaw(requestParameters: GetPropertyAliasesRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<{ [key: string]: Array<string>; }>> {
        if (requestParameters['propertyId'] == null) {
            throw new runtime.RequiredError(
                'propertyId',
                'Required parameter "propertyId" was null or undefined when calling getPropertyAliases().'
            );
        }

        const queryParameters: any = {};

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
            path: `/entities/properties/{property_id}/aliases`.replace(`{${"property_id"}}`, encodeURIComponent(String(requestParameters['propertyId']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse<any>(response);
    }

    /**
     * Retrieve a Property\'s aliases
     */
    async getPropertyAliases(requestParameters: GetPropertyAliasesRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<{ [key: string]: Array<string>; }> {
        const response = await this.getPropertyAliasesRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Retrieve a Property\'s aliases in a specific language
     */
    async getPropertyAliasesInLanguageRaw(requestParameters: GetPropertyAliasesInLanguageRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Array<string>>> {
        if (requestParameters['propertyId'] == null) {
            throw new runtime.RequiredError(
                'propertyId',
                'Required parameter "propertyId" was null or undefined when calling getPropertyAliasesInLanguage().'
            );
        }

        if (requestParameters['languageCode'] == null) {
            throw new runtime.RequiredError(
                'languageCode',
                'Required parameter "languageCode" was null or undefined when calling getPropertyAliasesInLanguage().'
            );
        }

        const queryParameters: any = {};

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
            path: `/entities/properties/{property_id}/aliases/{language_code}`.replace(`{${"property_id"}}`, encodeURIComponent(String(requestParameters['propertyId']))).replace(`{${"language_code"}}`, encodeURIComponent(String(requestParameters['languageCode']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse<any>(response);
    }

    /**
     * Retrieve a Property\'s aliases in a specific language
     */
    async getPropertyAliasesInLanguage(requestParameters: GetPropertyAliasesInLanguageRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Array<string>> {
        const response = await this.getPropertyAliasesInLanguageRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Change an Item\'s aliases
     */
    async patchItemAliasesRaw(requestParameters: PatchItemAliasesRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<{ [key: string]: Array<string>; }>> {
        if (requestParameters['itemId'] == null) {
            throw new runtime.RequiredError(
                'itemId',
                'Required parameter "itemId" was null or undefined when calling patchItemAliases().'
            );
        }

        if (requestParameters['aliasesPatchSchema'] == null) {
            throw new runtime.RequiredError(
                'aliasesPatchSchema',
                'Required parameter "aliasesPatchSchema" was null or undefined when calling patchItemAliases().'
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
            path: `/entities/items/{item_id}/aliases`.replace(`{${"item_id"}}`, encodeURIComponent(String(requestParameters['itemId']))),
            method: 'PATCH',
            headers: headerParameters,
            query: queryParameters,
            body: AliasesPatchSchemaToJSON(requestParameters['aliasesPatchSchema']),
        }, initOverrides);

        return new runtime.JSONApiResponse<any>(response);
    }

    /**
     * Change an Item\'s aliases
     */
    async patchItemAliases(requestParameters: PatchItemAliasesRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<{ [key: string]: Array<string>; }> {
        const response = await this.patchItemAliasesRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Change a Property\'s aliases
     */
    async patchPropertyAliasesRaw(requestParameters: PatchPropertyAliasesRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<{ [key: string]: Array<string>; }>> {
        if (requestParameters['propertyId'] == null) {
            throw new runtime.RequiredError(
                'propertyId',
                'Required parameter "propertyId" was null or undefined when calling patchPropertyAliases().'
            );
        }

        if (requestParameters['aliasesPatchSchema'] == null) {
            throw new runtime.RequiredError(
                'aliasesPatchSchema',
                'Required parameter "aliasesPatchSchema" was null or undefined when calling patchPropertyAliases().'
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
            path: `/entities/properties/{property_id}/aliases`.replace(`{${"property_id"}}`, encodeURIComponent(String(requestParameters['propertyId']))),
            method: 'PATCH',
            headers: headerParameters,
            query: queryParameters,
            body: AliasesPatchSchemaToJSON(requestParameters['aliasesPatchSchema']),
        }, initOverrides);

        return new runtime.JSONApiResponse<any>(response);
    }

    /**
     * Change a Property\'s aliases
     */
    async patchPropertyAliases(requestParameters: PatchPropertyAliasesRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<{ [key: string]: Array<string>; }> {
        const response = await this.patchPropertyAliasesRaw(requestParameters, initOverrides);
        return await response.value();
    }

}
