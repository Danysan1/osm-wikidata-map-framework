/* tslint:disable */
/* eslint-disable */
/**
 * SPARQL endpoint API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 1.0.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


import * as runtime from '../runtime';
import type {
  QLeverResponse,
  SparqlBackend,
  SparqlResponse,
} from '../models/index';
import {
    QLeverResponseFromJSON,
    QLeverResponseToJSON,
    SparqlBackendFromJSON,
    SparqlBackendToJSON,
    SparqlResponseFromJSON,
    SparqlResponseToJSON,
} from '../models/index';

export interface GetSparqlQueryRequest {
    backend: SparqlBackend;
    query: string;
}

export interface PostSparqlQueryRequest {
    backend: SparqlBackend;
    query: string;
    format?: string;
}

/**
 * 
 */
export class SparqlApi extends runtime.BaseAPI {

    /**
     * Run SPARQL query via GET
     */
    async getSparqlQueryRaw(requestParameters: GetSparqlQueryRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<SparqlResponse>> {
        if (requestParameters['backend'] == null) {
            throw new runtime.RequiredError(
                'backend',
                'Required parameter "backend" was null or undefined when calling getSparqlQuery().'
            );
        }

        if (requestParameters['query'] == null) {
            throw new runtime.RequiredError(
                'query',
                'Required parameter "query" was null or undefined when calling getSparqlQuery().'
            );
        }

        const queryParameters: any = {};

        if (requestParameters['query'] != null) {
            queryParameters['query'] = requestParameters['query'];
        }

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/{backend}`.replace(`{${"backend"}}`, encodeURIComponent(String(requestParameters['backend']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => SparqlResponseFromJSON(jsonValue));
    }

    /**
     * Run SPARQL query via GET
     */
    async getSparqlQuery(requestParameters: GetSparqlQueryRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<SparqlResponse> {
        const response = await this.getSparqlQueryRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Run SPARQL query via POST
     */
    async postSparqlQueryRaw(requestParameters: PostSparqlQueryRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<SparqlResponse>> {
        if (requestParameters['backend'] == null) {
            throw new runtime.RequiredError(
                'backend',
                'Required parameter "backend" was null or undefined when calling postSparqlQuery().'
            );
        }

        if (requestParameters['query'] == null) {
            throw new runtime.RequiredError(
                'query',
                'Required parameter "query" was null or undefined when calling postSparqlQuery().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const consumes: runtime.Consume[] = [
            { contentType: 'application/x-www-form-urlencoded' },
        ];
        // @ts-ignore: canConsumeForm may be unused
        const canConsumeForm = runtime.canConsumeForm(consumes);

        let formParams: { append(param: string, value: any): any };
        let useForm = false;
        if (useForm) {
            formParams = new FormData();
        } else {
            formParams = new URLSearchParams();
        }

        if (requestParameters['query'] != null) {
            formParams.append('query', requestParameters['query'] as any);
        }

        if (requestParameters['format'] != null) {
            formParams.append('format', requestParameters['format'] as any);
        }

        const response = await this.request({
            path: `/{backend}`.replace(`{${"backend"}}`, encodeURIComponent(String(requestParameters['backend']))),
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: formParams,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => SparqlResponseFromJSON(jsonValue));
    }

    /**
     * Run SPARQL query via POST
     */
    async postSparqlQuery(requestParameters: PostSparqlQueryRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<SparqlResponse> {
        const response = await this.postSparqlQueryRaw(requestParameters, initOverrides);
        return await response.value();
    }

}
