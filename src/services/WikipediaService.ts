/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
export class WikipediaService {
    /**
     * @see https://en.wikipedia.org/api/rest_v1/#/Page%20content/get_page_summary__title_
     */
    async fetchExtract(articleURL: string): Promise<string> {
        const response = await fetch(articleURL?.replace("/wiki/", "/api/rest_v1/page/summary/") + "?redirect=true");
        if (response.status === 302)
            throw new Error("The Wikipedia page for this item is a redirect");
        if (response.status !== 200)
            throw new Error("The request for the Wikipedia extract failed with code " + response.status);

        const content = await response.json();
        if (!content || typeof content !== "object")
            throw new Error("The response from Wikipedia is not valid");

        const extract = content.extract;
        if (!extract || typeof extract !== "string")
            throw new Error("The response from Wikipedia is not valid");

        return extract;
    }
}