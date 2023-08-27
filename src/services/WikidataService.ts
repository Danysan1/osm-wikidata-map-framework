import { debug, getConfig } from "../config";
import detailsQuery from "./query/etymology-details.sparql";
import { EtymologyDetails } from "../feature.model";
import { Configuration, SparqlApi, SparqlResponse } from "../generated/sparql";
import { logErrorMessage } from "../monitoring";

export class WikidataService {
    public static readonly WD_ENTITY_PREFIX = "http://www.wikidata.org/entity/";
    public static readonly WD_PROPERTY_PREFIX = "http://www.wikidata.org/prop/direct/";
    protected api: SparqlApi;
    protected defaultLanguage: string;
    protected language?: string;

    public constructor() {
        this.api = new SparqlApi(new Configuration({
            basePath: getConfig("wikidata_endpoint") || "https://query.wikidata.org"
        }));
        this.defaultLanguage = getConfig("default_language") || 'en';
        this.language = document.documentElement.lang.split('-').at(0);
    }

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

    async etymologyIDsQuery(etymologyIDs: string[], sparqlQueryTemplate: string): Promise<SparqlResponse> {
        const wikidataValues = etymologyIDs.map(id => "wd:" + id).join(" "),
            sparqlQuery = sparqlQueryTemplate
                .replaceAll('${wikidataValues}', wikidataValues)
                .replaceAll('${language}', this.language || '')
                .replaceAll('${defaultLanguage}', this.defaultLanguage);
        return await this.api.postSparqlQuery({ format: "json", query: sparqlQuery });
    }

    async fetchEtymologyDetails(etymologyIDs: string[]): Promise<EtymologyDetails[]> {
        const cacheKey = `owmf.details.${this.language}_${etymologyIDs.join("_")}`,
            cachedResponse = localStorage.getItem(cacheKey);
        let out: EtymologyDetails[];
        if (cachedResponse) {
            out = JSON.parse(cachedResponse);
            if (debug) console.info("Cache hit, using cached response", { cacheKey, out });
        } else {
            if (debug) console.info("Cache miss, fetching data", { cacheKey });
            const res = await this.etymologyIDsQuery(etymologyIDs, detailsQuery);

            if (!res?.results?.bindings?.length) {
                console.warn("fetchEtymologyDetails: no results");
                return [];
            }

            out = res.results.bindings.map((x: any): EtymologyDetails => {
                const wdURI = x.wikidata.value as string,
                    wdQID = wdURI.replace(WikidataService.WD_ENTITY_PREFIX, "");
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
                    genderID: x.genderID?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
                    instance: x.instance?.value,
                    instanceID: x.instanceID?.value?.replace(WikidataService.WD_ENTITY_PREFIX, ""),
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
            try {
                localStorage.setItem(cacheKey, JSON.stringify(out));
            } catch (e) {
                logErrorMessage("Failed to store details data in cache", "warning", { cacheKey, out, e });
            }
        }
        return out;
    }
}
