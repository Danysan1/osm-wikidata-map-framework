import { CommonsApi } from "../generated/commons/apis/CommonsApi";
import { Configuration } from "../generated/commons/runtime";

export class WikimediaCommonsService {
    private readonly api: CommonsApi;

    constructor(baseURL?: string) {
        this.api = new CommonsApi(new Configuration({
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            basePath: baseURL || "https://commons.wikimedia.org/w",
            // headers: { "User-Agent": "OSM-Wikidata-Map-Framework" }
        }));
    }

    /**
     * Fetch the attribution text for a Wikimedia Commons file (includes license and author)
     * 
     * @param imgName File name from Wikimedia Commons (NON URLencoded, without the initial "File:")
     * @see https://commons.wikimedia.org/wiki/Commons:Credit_line#Automatic_handling_of_attribution_by_reusers
     * @see https://commons.wikimedia.org/w/api.php?action=help&modules=main
     * @see https://www.mediawiki.org/wiki/API:Main_page
     * @see https://www.mediawiki.org/wiki/API:Cross-site_requests
     * @see https://www.mediawiki.org/wiki/Manual:CORS#Using_jQuery_methods
     */
    async fetchAttribution(imgName: string): Promise<string> {
        const metadata = await this.fetchMetadata(imgName),
            license = metadata?.LicenseShortName?.value ?? "?",
            artist = metadata?.Artist?.value?.replace(/<span style="display: none;">.*<\/span>/, "") ?? "?";
        return `Wikimedia Commons - ${artist} - ${license}`;
    }

    async fetchMetadata(imgName: string) {
        const res = await this.api.apiCall({
            action: "query",
            prop: "imageinfo",
            iiprop: "extmetadata",
            iiextmetadatafilter: "Artist|LicenseShortName",
            format: "json",
            titles: "File:" + imgName,
            origin: '*',
        }),
            pages = res.query?.pages;
        if (!pages)
            throw new Error("No pages in response");
        const pageID = Object.keys(pages)[0],
            metadata = pages[pageID]?.imageinfo?.[0]?.extmetadata;
        console.debug("Commons fetchMetadata", { imgName, pages, metadata });
        return metadata;
    }
}