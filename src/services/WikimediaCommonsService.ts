export class WikimediaCommonsService {
    private baseURL: string;

    constructor(baseURL?: string) {
        this.baseURL = baseURL || "https://commons.wikimedia.org/w/api.php";
    }

    /**
     * @param imgName File name from Wikimedia Commons (NON URLencoded, withouth the initial "File:")
     * @returns The attribution text for the file (includes license and author)
     * @see https://commons.wikimedia.org/wiki/Commons:Credit_line#Automatic_handling_of_attribution_by_reusers
     * @see https://commons.wikimedia.org/w/api.php?action=help&modules=main
     * @see https://www.mediawiki.org/wiki/API:Main_page
     * @see https://www.mediawiki.org/wiki/API:Cross-site_requests
     * @see https://www.mediawiki.org/wiki/Manual:CORS#Using_jQuery_methods
     */
    async fetchAttribution(imgName: string): Promise<string> {
        const attributionApiUrl = this.baseURL + "?" + (new URLSearchParams({
            action: "query",
            prop: "imageinfo",
            iiprop: "extmetadata",
            iiextmetadatafilter: "Artist|LicenseShortName",
            format: "json",
            titles: "File:" + imgName,
            origin: '*',
        })).toString();

        return fetch(attributionApiUrl)
            .then(response => {
                if (response.status == 200)
                    return response.json();
                else
                    throw new Error("The request for the Wikimedia Commons attribution failed with code " + response.status);
            })
            .then(res => {
                const pages = res.query.pages,
                    pageID = Object.keys(pages)[0],
                    extmetadata = pages[pageID].imageinfo[0].extmetadata,
                    license = extmetadata?.LicenseShortName?.value,
                    artist = extmetadata?.Artist?.value;
                let imgAttribution = "Wikimedia Commons";
                if (typeof license === "string")
                    imgAttribution += " - " + license;
                if (typeof artist === "string")
                    imgAttribution += " - " + artist.replace(/<span style="display: none;">.*<\/span>/, "");
                return imgAttribution;
            });
    }
}