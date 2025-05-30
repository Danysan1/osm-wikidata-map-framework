import { Configuration, LabelsApi } from "wikibase-rest-api-ts";

export class WikidataLabelService {
    protected readonly api: LabelsApi;

    public constructor(basePath = 'https://www.wikidata.org/w/rest.php/wikibase/v0') {
        this.api = new LabelsApi(new Configuration({
            basePath,
            // headers: { "User-Agent": "OSM-Wikidata-Map-Framework" }
        }));
    }

    public getLabelFromWikidataID(wikidataID: string, languageCode: string): Promise<string> {
        return this.api.getItemLabel({ itemId: wikidataID, languageCode });
    }

    public async getSomeLabelFromWikidataID(wikidataID: string, preferredLanguageCode?: string): Promise<string | undefined> {
        const labels = await this.api.getItemLabels({ itemId: wikidataID });
        if (preferredLanguageCode && labels[preferredLanguageCode]) {
            return labels[preferredLanguageCode];
        } else if (labels.mul) {
            return labels.mul;
        } else if (labels.en) {
            return labels.en;
        } else {
            return Object.values(labels)[0];
        }
    }
}
