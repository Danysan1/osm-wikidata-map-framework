import { Configuration, StatementsApi } from "wikibase-rest-api-ts";

export class WikidataStatementService {
    protected readonly api: StatementsApi;

    public constructor(basePath = 'https://www.wikidata.org/w/rest.php/wikibase') {
        this.api = new StatementsApi(new Configuration({
            basePath,
            // headers: { "User-Agent": "OSM-Wikidata-Map-Framework" } // Must be set: https://foundation.wikimedia.org/wiki/Policy:User-Agent_policy
        }));
    }

    public async getCommonsImageFromWikidataID(wikidataID: string): Promise<string | null> {
        const res = await this.api.getItemStatements({
            itemId: wikidataID,
            property: "P18",
        }),
            content: unknown = res?.P18?.at(0)?.value?.content;
        return typeof content === "string" ? content : null;
    }
}
