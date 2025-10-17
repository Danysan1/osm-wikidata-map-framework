import { CommonsApi, CommonsApiResponse } from "../generated/commons/api";
import { Configuration } from "../generated/commons/configuration";

export const COMMONS_FILE_REGEX = /(Special:FilePath\/)|(File:)|(commons\/\w\/\w\w\/)/,
    COMMONS_CATEGORY_REGEX = /(Category:[^;]+)/;

const COMMONS_PREFIX_REGEX = /^.*((Special:FilePath\/)|(File:)|(commons\/\w\/\w\w\/))/,
    COMMONS_SUFFIX_REGEX = /[;?].*$/;

export function normalizeCommonsTitle(name: string) {
    return decodeURIComponent(
        name.replace(COMMONS_PREFIX_REGEX, "")
            .replace(COMMONS_SUFFIX_REGEX, "")
    );
}

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
            license = metadata?.LicenseShortName?.value,
            artist = metadata?.Attribution?.value ?? metadata?.Artist?.value;
        let attribution = "Wikimedia Commons";
        if (artist) attribution += ` - ${artist.replace(/<span style="display: none;">.*<\/span>/, "")}`; // Yeah I know I know I shouldn't use regex on HTML
        if (process.env.NEXT_PUBLIC_OWMF_show_attribution_license && license)
            attribution += ` - ${license}`;
        return attribution;
    }

    async fetchMetadata(imgName: string) {
        const res: CommonsApiResponse = (await this.api.apiCall(
            "query", "json", undefined, "Artist|LicenseShortName|Attribution", "extmetadata", "*", "imageinfo", "File:" + imgName
        )).data,
            pages = res.query?.pages;
        if (!pages)
            throw new Error("No pages in response");
        const pageID = Object.keys(pages)[0],
            metadata = pages[pageID]?.imageinfo?.[0]?.extmetadata;
        console.debug("Commons fetchMetadata", { imgName, pages, metadata });
        return metadata;
    }

    /**
     * 
     * @param category Category name, e.g. "Category:Maps" (NON URLencoded)
     * @see https://commons.wikimedia.org/wiki/Commons:API/MediaWiki#Get_files_in_a_particular_category
     * @see https://www.mediawiki.org/wiki/API:Categorymembers
     */
    async getFilesInCategory(category: string, limit = 5): Promise<string[]> {
        const res: CommonsApiResponse = (await this.api.apiCall(
            "query", "json", undefined, undefined, undefined, "*", undefined, undefined, "categorymembers", "file", limit, category
        )).data;
        console.debug("Commons getFilesInCategory", { category, limit, res });
        return res.query?.categorymembers?.filter(cm => cm.title)?.map(cm => cm.title!) ?? [];
    }
}