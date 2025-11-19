/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
export class WikipediaService {
    /**
     * @see https://en.wikipedia.org/api/rest_v1/#/Page%20content/get_page_summary__title_
     */
    async fetchExtract(article: string): Promise<string> {
        let title: string, url: string;
        if (article.startsWith("http")) {
            title = decodeURIComponent(article.substring(article.lastIndexOf("/wiki/") + 6));
            url = article.replace("/wiki/", "/api/rest_v1/page/summary/") + "?redirect=true";
        } else {
            const split = article.split(":");
            title = split[1];
            url = `https://${split[0]}.wikipedia.org/api/rest_v1/page/summary/${split[1]}?redirect=true`;
        }
        console.debug("fetchExtract", { article, title, url });
        const response = await fetch(url);
        if (response.status === 302)
            throw new Error("The Wikipedia page for this item is an HTTP 302 redirect, ignoring it");
        if (response.status !== 200)
            throw new Error("The request for the Wikipedia extract failed with code " + response.status);

        const content = await response.json();
        if (!content || typeof content !== "object")
            throw new Error("The response from Wikipedia is not valid");

        if (content.title !== title)
            throw new Error("The Wikipedia page for this item is a redirect, ignoring it");

        const extract = content.extract;
        if (!extract || typeof extract !== "string")
            throw new Error("The response from Wikipedia is not valid");

        return extract;
    }
}