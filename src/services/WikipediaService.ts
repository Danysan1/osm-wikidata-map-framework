export class WikipediaService {
    /**
     * @see https://en.wikipedia.org/api/rest_v1/#/Page%20content/get_page_summary__title_
     */
    async fetchExtract(articleURL: string): Promise<string> {
        return fetch(articleURL?.replace("/wiki/", "/api/rest_v1/page/summary/") + "?redirect=true")
            .then(response => {
                if (response.status == 200)
                    return response.json();
                else if (response.status == 302)
                    throw new Error("The Wikipedia page for this item is a redirect");
                else
                    throw new Error("The request for the Wikipedia extract failed with code " + response.status);
            })
            .then(res => {
                return res.extract;
            });
    }
}