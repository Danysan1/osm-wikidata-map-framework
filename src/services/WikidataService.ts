import { getConfig } from "../config";
import detailsQuery from "./query/etymology-details.sparql";
import { EtymologyDetails } from "../feature.model";

export class WikidataService {
    async getCommonsImageFromWikidataID(wikidataID: string): Promise<string | null> {
        const url = `https://www.wikidata.org/w/rest.php/wikibase/v0/entities/items/${wikidataID}/statements?property=P18`,
            response = await fetch(url),
            res = await response.json();
        if (res?.P18?.at(0)?.value?.content) {
            return res.P18.at(0).value.content as string;
        } else {
            return null;
        }
    }

    async etymologyIDsQuery(etymologyIDs: string[], sparqlQueryTemplate: string): Promise<any> {
        const defaultLanguage = getConfig("default_language") || 'en',
            language = document.documentElement.lang.split('-').at(0),
            wikidataValues = etymologyIDs.map(id => "wd:" + id).join(" "),
            sparqlQuery = sparqlQueryTemplate.replaceAll('${wikidataValues}', wikidataValues).replaceAll('${language}', language || '').replaceAll('${defaultLanguage}', defaultLanguage),
            baseURL = getConfig("wikidata_endpoint") || "https://query.wikidata.org/sparql",
            response = await fetch(baseURL, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ format: "json", query: sparqlQuery }).toString(),
            });
        return response.json();
    }

    async fetchEtymologyDetails(etymologyIDs: string[]): Promise<EtymologyDetails[]> {
        const res = await this.etymologyIDsQuery(etymologyIDs, detailsQuery);

        return res?.results?.bindings?.map((x: any): EtymologyDetails => {
            const wdURI = x.wikidata.value as string,
                wdQID = wdURI.replace("http://www.wikidata.org/entity/", "");
            return {
                birth_date: x.birth_date?.value,
                birth_date_precision: x.birth_date_precision?.value ? parseInt(x.birth_date_precision.value) : undefined,
                birth_place: x.birth_place?.value,
                citizenship: x.citizenship?.value,
                commons: x.commons?.value,
                death_date: x.death_date?.value,
                death_date_precision: x.death_date_precision?.value ? parseInt(x.death_date_precision.value) : undefined,
                death_place: x.death_place?.value,
                description: x.description?.value,
                end_date: x.end_date?.value,
                end_date_precision: x.end_date_precision?.value ? parseInt(x.end_date_precision.value) : undefined,
                event_date: x.event_date?.value,
                event_date_precision: x.event_date_precision?.value ? parseInt(x.event_date_precision.value) : undefined,
                event_place: x.event_place?.value,
                gender: x.gender?.value,
                genderID: x.genderID?.value?.replace("http://www.wikidata.org/entity/", ""),
                instance: x.instance?.value,
                instanceID: x.instanceID?.value?.replace("http://www.wikidata.org/entity/", ""),
                name: x.name?.value,
                occupations: x.occupations?.value,
                pictures: x.pictures?.value?.split("||"),
                prizes: x.prizes?.value,
                start_date: x.start_date?.value,
                start_date_precision: parseInt(x.start_date_precision?.value),
                wikipedia: x.wikipedia?.value,
                wkt_coords: x.wkt_coords?.value,
                wikidata: wdQID,
            };
        });
    }
}
