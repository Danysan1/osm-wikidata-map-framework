import { debug, getConfig } from "../config";
import detailsQuery from "./query/etymology-details.sparql";
import { EtymologyDetails } from "../feature.model";
import { Configuration, SparqlApi, SparqlResponse } from "../generated/sparql";
import { logErrorMessage } from "../monitoring";

export class WikidataService {
    public static readonly WD_ENTITY_PREFIX = "http://www.wikidata.org/entity/";
    public static readonly WD_PROPERTY_PREFIX = "http://www.wikidata.org/prop/direct/";
    protected api: SparqlApi;
    protected defaultLanguage: string;
    protected language: string;

    public constructor() {
        this.api = new SparqlApi(new Configuration({
            basePath: getConfig("wikidata_endpoint") || "https://query.wikidata.org"
        }));
        this.defaultLanguage = getConfig("default_language") || 'en';
        this.language = document.documentElement.lang.split('-').at(0) || this.defaultLanguage;
    }

    async getCommonsImageFromWikidataID(wikidataID: string): Promise<string | null> {
        const url = `https://www.wikidata.org/w/rest.php/wikibase/v0/entities/items/${wikidataID}/statements?property=P18`,
            response = await fetch(url),
            res = await response.json();
        if (res?.P18?.at(0)?.value?.content) {
            return res.P18.at(0).value.content as string;
        } else {
            return null;
        }
    }

    async etymologyIDsQuery(etymologyIDs: string[], sparqlQueryTemplate: string): Promise<SparqlResponse> {
        const wikidataValues = etymologyIDs.map(id => "wd:" + id).join(" "),
            sparqlQuery = sparqlQueryTemplate
                .replaceAll('${wikidataValues}', wikidataValues)
                .replaceAll('${language}', this.language || '')
                .replaceAll('${defaultLanguage}', this.defaultLanguage);
        return await this.api.postSparqlQuery({ format: "json", query: sparqlQuery });
    }
}
