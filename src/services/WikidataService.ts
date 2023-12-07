import { Configuration, SparqlApi, SparqlResponse } from "../generated/sparql";

export class WikidataService {
    public static readonly WD_ENTITY_PREFIX = "http://www.wikidata.org/entity/";
    public static readonly WD_PROPERTY_PREFIX = "http://www.wikidata.org/prop/direct/";
    protected api: SparqlApi;

    public constructor(basePath = 'https://query.wikidata.org') {
        this.api = new SparqlApi(new Configuration({ basePath }));
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

    async etymologyIDsQuery(language: string, etymologyIDs: string[], sparqlQueryTemplate: string): Promise<SparqlResponse> {
        const wikidataValues = etymologyIDs.map(id => "wd:" + id).join(" "),
            sparqlQuery = sparqlQueryTemplate
                .replaceAll('${wikidataValues}', wikidataValues)
                .replaceAll('${language}', language);
        return await this.api.postSparqlQuery({ backend: "sparql", format: "json", query: sparqlQuery });
    }
}
