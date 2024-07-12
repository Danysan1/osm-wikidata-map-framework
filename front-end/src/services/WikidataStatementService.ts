import { Configuration } from "../generated/wikibase/runtime";
import { StatementsApi } from "../generated/wikibase/apis/StatementsApi";

export class WikidataStatementService {
    protected readonly api: StatementsApi;

    public constructor(basePath = 'https://www.wikidata.org/w/rest.php/wikibase/v0') {
        this.api = new StatementsApi(new Configuration({
            basePath,
            // headers: { "User-Agent": "OSM-Wikidata-Map-Framework" }
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
