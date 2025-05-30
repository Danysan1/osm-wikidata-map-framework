import { Configuration, DescriptionsApi } from "wikibase-rest-api-ts";

export class WikidataDescriptionService {
    protected readonly api: DescriptionsApi;

    public constructor(basePath = 'https://www.wikidata.org/w/rest.php/wikibase/v0') {
        this.api = new DescriptionsApi(new Configuration({
            basePath,
            // headers: { "User-Agent": "OSM-Wikidata-Map-Framework" }
        }));
    }

    public getDescriptionFromWikidataID(wikidataID: string, languageCode: string): Promise<string> {
        return this.api.getItemDescription({ itemId: wikidataID, languageCode });
    }

    public async getSomeDescriptionFromWikidataID(wikidataID: string, preferredLanguageCode?: string): Promise<string | undefined> {
        const descriptions = await this.api.getItemDescriptions({ itemId: wikidataID });
        if (preferredLanguageCode && descriptions[preferredLanguageCode]) {
            return descriptions[preferredLanguageCode];
        } else if (descriptions.mul) {
            return descriptions.mul;
        } else if (descriptions.en) {
            return descriptions.en;
        } else {
            return Object.values(descriptions)[0];
        }
    }
}
