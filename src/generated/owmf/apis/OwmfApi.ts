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


import * as runtime from '../runtime';
import type {
  ElementResponse,
  ErrorDetails,
  EtymologyResponse,
  GlobalMapResponse,
} from '../models';
import {
    ElementResponseFromJSON,
    ElementResponseToJSON,
    ErrorDetailsFromJSON,
    ErrorDetailsToJSON,
    EtymologyResponseFromJSON,
    EtymologyResponseToJSON,
    GlobalMapResponseFromJSON,
    GlobalMapResponseToJSON,
} from '../models';

export interface GetElementsRequest {
    minLat: number;
    minLon: number;
    maxLat: number;
    maxLon: number;
    source: string;
    search?: string;
}

export interface GetEtymologiesRequest {
    minLat: number;
    minLon: number;
    maxLat: number;
    maxLon: number;
    language: string;
    source: string;
    search?: string;
}

/**
 * 
 */
export class OwmfApi extends runtime.BaseAPI {

    /**
     * Get centroids of features having an etymology in an area
     */
    async getElementsRaw(requestParameters: GetElementsRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<ElementResponse>> {
        if (requestParameters.minLat === null || requestParameters.minLat === undefined) {
            throw new runtime.RequiredError('minLat','Required parameter requestParameters.minLat was null or undefined when calling getElements.');
        }

        if (requestParameters.minLon === null || requestParameters.minLon === undefined) {
            throw new runtime.RequiredError('minLon','Required parameter requestParameters.minLon was null or undefined when calling getElements.');
        }

        if (requestParameters.maxLat === null || requestParameters.maxLat === undefined) {
            throw new runtime.RequiredError('maxLat','Required parameter requestParameters.maxLat was null or undefined when calling getElements.');
        }

        if (requestParameters.maxLon === null || requestParameters.maxLon === undefined) {
            throw new runtime.RequiredError('maxLon','Required parameter requestParameters.maxLon was null or undefined when calling getElements.');
        }

        if (requestParameters.source === null || requestParameters.source === undefined) {
            throw new runtime.RequiredError('source','Required parameter requestParameters.source was null or undefined when calling getElements.');
        }

        const queryParameters: any = {};

        if (requestParameters.minLat !== undefined) {
            queryParameters['minLat'] = requestParameters.minLat;
        }

        if (requestParameters.minLon !== undefined) {
            queryParameters['minLon'] = requestParameters.minLon;
        }

        if (requestParameters.maxLat !== undefined) {
            queryParameters['maxLat'] = requestParameters.maxLat;
        }

        if (requestParameters.maxLon !== undefined) {
            queryParameters['maxLon'] = requestParameters.maxLon;
        }

        if (requestParameters.source !== undefined) {
            queryParameters['source'] = requestParameters.source;
        }

        if (requestParameters.search !== undefined) {
            queryParameters['search'] = requestParameters.search;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/elements.php`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => ElementResponseFromJSON(jsonValue));
    }

    /**
     * Get centroids of features having an etymology in an area
     */
    async getElements(requestParameters: GetElementsRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ElementResponse> {
        const response = await this.getElementsRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Get features and relative etymologies in an area
     */
    async getEtymologiesRaw(requestParameters: GetEtymologiesRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<EtymologyResponse>> {
        if (requestParameters.minLat === null || requestParameters.minLat === undefined) {
            throw new runtime.RequiredError('minLat','Required parameter requestParameters.minLat was null or undefined when calling getEtymologies.');
        }

        if (requestParameters.minLon === null || requestParameters.minLon === undefined) {
            throw new runtime.RequiredError('minLon','Required parameter requestParameters.minLon was null or undefined when calling getEtymologies.');
        }

        if (requestParameters.maxLat === null || requestParameters.maxLat === undefined) {
            throw new runtime.RequiredError('maxLat','Required parameter requestParameters.maxLat was null or undefined when calling getEtymologies.');
        }

        if (requestParameters.maxLon === null || requestParameters.maxLon === undefined) {
            throw new runtime.RequiredError('maxLon','Required parameter requestParameters.maxLon was null or undefined when calling getEtymologies.');
        }

        if (requestParameters.language === null || requestParameters.language === undefined) {
            throw new runtime.RequiredError('language','Required parameter requestParameters.language was null or undefined when calling getEtymologies.');
        }

        if (requestParameters.source === null || requestParameters.source === undefined) {
            throw new runtime.RequiredError('source','Required parameter requestParameters.source was null or undefined when calling getEtymologies.');
        }

        const queryParameters: any = {};

        if (requestParameters.minLat !== undefined) {
            queryParameters['minLat'] = requestParameters.minLat;
        }

        if (requestParameters.minLon !== undefined) {
            queryParameters['minLon'] = requestParameters.minLon;
        }

        if (requestParameters.maxLat !== undefined) {
            queryParameters['maxLat'] = requestParameters.maxLat;
        }

        if (requestParameters.maxLon !== undefined) {
            queryParameters['maxLon'] = requestParameters.maxLon;
        }

        if (requestParameters.language !== undefined) {
            queryParameters['language'] = requestParameters.language;
        }

        if (requestParameters.source !== undefined) {
            queryParameters['source'] = requestParameters.source;
        }

        if (requestParameters.search !== undefined) {
            queryParameters['search'] = requestParameters.search;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/etymologyMap.php`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => EtymologyResponseFromJSON(jsonValue));
    }

    /**
     * Get features and relative etymologies in an area
     */
    async getEtymologies(requestParameters: GetEtymologiesRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<EtymologyResponse> {
        const response = await this.getEtymologiesRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Get clusters of etymologies worldwide
     */
    async getGlobalMapRaw(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<GlobalMapResponse>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/global-map.php`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => GlobalMapResponseFromJSON(jsonValue));
    }

    /**
     * Get clusters of etymologies worldwide
     */
    async getGlobalMap(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<GlobalMapResponse> {
        const response = await this.getGlobalMapRaw(initOverrides);
        return await response.value();
    }

    /**
     * Check whether the server is running fine
     */
    async healthCheckRaw(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<void>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/health.php`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.VoidApiResponse(response);
    }

    /**
     * Check whether the server is running fine
     */
    async healthCheck(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<void> {
        await this.healthCheckRaw(initOverrides);
    }

}