import { SparqlApi } from "../generated/sparql/apis/SparqlApi";
import type { SparqlResponse } from "../generated/sparql/models/SparqlResponse";
import { Configuration } from "../generated/sparql/runtime";

export class WikidataService {
    public static readonly WD_ENTITY_PREFIX = "http://www.wikidata.org/entity/";
    public static readonly WD_PROPERTY_WDT_PREFIX = "http://www.wikidata.org/prop/direct/";
    public static readonly WD_PROPERTY_P_PREFIX = "http://www.wikidata.org/prop/";
    protected readonly api: SparqlApi;

    public constructor(basePath = process.env.owmf_wikidata_endpoint) {
        this.api = new SparqlApi(new Configuration({
            basePath: basePath?.length ? basePath : 'https://query.wikidata.org',
            // headers: { "User-Agent": "OSM-Wikidata-Map-Framework" } // In theory it should be set (https://foundation.wikimedia.org/wiki/Policy:User-Agent_policy) but in practice it causes a CORS error
        }));
    }

    protected async etymologyIDsQuery(language: string, etymologyIDs: string[], sparqlQueryTemplate: string): Promise<SparqlResponse> {
        const wikidataValues = etymologyIDs.map(id => "wd:" + id).join(" "),
            sparqlQuery = sparqlQueryTemplate
                .replaceAll('${wikidataValues}', wikidataValues)
                .replaceAll('${language}', language);
        return await this.api.postSparqlQuery({ backend: "sparql", format: "json", query: sparqlQuery });
    }
}
