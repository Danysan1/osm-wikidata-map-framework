import { getConfig } from "../config";
import { EtymologyDetails } from "../EtymologyElement";

export class WikidataService {
    private baseURL: string;

    constructor(baseURL?: string) {
        this.baseURL = baseURL || getConfig("wikidata_endpoint") || "https://query.wikidata.org/sparql";
    }

    async fetchEtymologyDetails(etymologyIDs: string[]): Promise<EtymologyDetails[]> {
        const culture = document.documentElement.lang,
            language = culture.split('-')[0],
            wikidataValues = etymologyIDs.join(" "),
            sparql = `
SELECT ?wikidata
    (SAMPLE(?name) AS ?name)
    (SAMPLE(?description) AS ?description)
    (SAMPLE(?instanceID) AS ?instanceID)
    (SAMPLE(?instance_name) AS ?instance)
    (SAMPLE(?genderID) AS ?genderID)
    (SAMPLE(?gender_name) AS ?gender)
    (SAMPLE(?wikipedia) AS ?wikipedia)
    (SAMPLE(?commons) AS ?commons)
    (GROUP_CONCAT(DISTINCT ?occupation_name; SEPARATOR=', ') AS ?occupations)
    (GROUP_CONCAT(DISTINCT ?citizenship_name; SEPARATOR=', ') AS ?citizenship)
    (GROUP_CONCAT(DISTINCT ?picture; SEPARATOR='||') AS ?pictures)
    (GROUP_CONCAT(DISTINCT ?prize_name; SEPARATOR=', ') AS ?prizes)
    (SAMPLE(?end_date) AS ?end_date)
    (SAMPLE(?end_date_precision) AS ?end_date_precision)
    (SAMPLE(?death_date) AS ?death_date)
    (SAMPLE(?death_date_precision) AS ?death_date_precision)
    (GROUP_CONCAT(DISTINCT ?event_place_name; SEPARATOR=', ') AS ?event_place)
    (SAMPLE(?birth_place_name) AS ?birth_place)
    (SAMPLE(?death_place_name) AS ?death_place)
    (SAMPLE(?wkt_coords) AS ?wkt_coords)
WHERE {
    VALUES ?wikidata { ${wikidataValues} }

    {
        ?name ^rdfs:label ?wikidata.
        FILTER(lang(?name)='${language}').
        OPTIONAL {
            ?description ^schema:description ?wikidata.
            FILTER(lang(?description)='${language}').
        }
    } UNION {
        MINUS {
            ?other_name ^rdfs:label ?wikidata.
            FILTER(lang(?other_name)='${language}').
        }
        ?name ^rdfs:label ?wikidata.
        FILTER(lang(?name)='en').
        OPTIONAL {
            ?description ^schema:description ?wikidata.
            FILTER(lang(?description)='en').
        }
    } UNION {
        MINUS {
            ?other_name ^rdfs:label ?wikidata.
            FILTER(lang(?other_name)='${language}' || lang(?other_name)='en').
        }
        ?name ^rdfs:label ?wikidata.
    }

    OPTIONAL {
        ?occupation ^wdt:P106 ?wikidata.
        {
            ?gender ^wdt:P21 ?wikidata.
            FILTER(?gender IN (wd:Q6581072, wd:Q1052281)). # female / transgender female
            ?occupation_name ^wdt:P2521 ?occupation. # female form of occupation label
        } UNION {
            MINUS {
                ?occupation_name ^wdt:P2521 ?occupation.
                FILTER(lang(?occupation_name)='${language}').
            }. # female form of occupation is NOT available in this language
            ?gender ^wdt:P21 ?wikidata.
            FILTER(?gender IN (wd:Q6581072, wd:Q1052281)). # female / transgender female
            ?occupation_name ^rdfs:label ?occupation. # base occupation label
        } UNION {
            ?gender ^wdt:P21 ?wikidata.
            FILTER(?gender NOT IN (wd:Q6581072, wd:Q1052281)). # NOT female / transgender female
            ?occupation_name ^wdt:P3321 ?occupation. # male form of occupation label
        } UNION {
            MINUS {
                ?occupation_name ^wdt:P3321 ?occupation.
                FILTER(lang(?occupation_name)='${language}').
            }. # male form of occupation is NOT available in this language
            ?gender ^wdt:P21 ?wikidata.
            FILTER(?gender NOT IN (wd:Q6581072, wd:Q1052281)). # NOT female / transgender female
            ?occupation_name ^rdfs:label ?occupation. # male form of occupation label
        } UNION {
            MINUS { ?wikidata wdt:P21 []. } . # no gender specified
            ?occupation_name ^rdfs:label ?occupation. # base occupation label
        }
        FILTER(lang(?occupation_name)='${language}').
    }

    OPTIONAL {
        ?picture ^wdt:P18|^wdt:P94|^wdt:P242|^wdt:P15|^wdt:P41 ?wikidata.
# picture - https://www.wikidata.org/wiki/Property:P18
# coat of arms image - https://www.wikidata.org/wiki/Property:P94
# locator map image - https://www.wikidata.org/wiki/Property:P242
# route map - https://www.wikidata.org/wiki/Property:P15
# flag - https://www.wikidata.org/wiki/Property:P41
    }

    OPTIONAL {
        ?wikidata (p:P582/psv:P582)|(p:P576/psv:P576)|(p:P3999/psv:P3999) [
# end time - https://www.wikidata.org/wiki/Property:P582
# dissolved, abolished or demolished date - https://www.wikidata.org/wiki/Property:P576
# date of official closure - https://www.wikidata.org/wiki/Property:P3999
            wikibase:timePrecision ?end_date_precision;
            wikibase:timeValue ?end_date
        ].
        MINUS {
            ?wikidata (p:P582/psv:P582/wikibase:timePrecision)|(p:P576/psv:P576/wikibase:timePrecision)|(p:P3999/psv:P3999/wikibase:timePrecision) ?other_end_date_precision.
            FILTER (?other_end_date_precision > ?end_date_precision).
        }.
    }

    OPTIONAL {
        ?wikidata p:P570/psv:P570 [ # death date - https://www.wikidata.org/wiki/Property:P570
            wikibase:timePrecision ?death_date_precision;
            wikibase:timeValue ?death_date
        ].
        MINUS {
            ?wikidata p:P570/psv:P570/wikibase:timePrecision ?other_death_date_precision.
            FILTER (?other_death_date_precision > ?death_date_precision).
        }.
    }

    OPTIONAL {
        ?event_place_name ^rdfs:label/^wdt:P276 ?wikidata.
        FILTER(lang(?event_place_name)='${language}').
    }

    OPTIONAL {
        ?birth_place_name ^rdfs:label/^wdt:P19 ?wikidata.
        FILTER(lang(?birth_place_name)='${language}').
    }

    OPTIONAL {
        ?death_place_name ^rdfs:label/^wdt:P20 ?wikidata.
        FILTER(lang(?death_place_name)='${language}').
    }

    OPTIONAL {
        ?wikipedia schema:about ?wikidata;
            schema:inLanguage '${language}';
            schema:isPartOf [ wikibase:wikiGroup 'wikipedia' ].
    }

    OPTIONAL {
        ?commons ^wdt:P373 ?wikidata.
    }

    OPTIONAL {
        ?prize ^wdt:P166 ?wikidata # awarded prize
        {
            ?prize_group ^wdt:P361 ?prize.
            FILTER(?prize_group IN (wd:Q7191,wd:Q19020,wd:Q41254)). # Nobel, Academy (Oscar), Grammy
        } UNION {
            ?prize wdt:P31 wd:Q28444913. # Palme d'Or (Cannes)
        } UNION {
            ?prize wdt:P1027 wd:Q49024. # Golden Lion (Venice)
        }
        ?prize_name ^rdfs:label ?prize.
        FILTER(lang(?prize_name)='${language}').
    }

    OPTIONAL {
        ?wkt_coords ^wdt:P625 ?wikidata.
        FILTER(STRSTARTS(?wkt_coords, 'Point')).
    }

    OPTIONAL {
        ?citizenship_name ^rdfs:label/^wdt:P27 ?wikidata.
        FILTER(lang(?citizenship_name)='${language}').
    }
}
GROUP BY ?wikidata
            `,
            response = await fetch(this.baseURL, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ format: "json", query: sparql }).toString(),
            }),
            res = await response.json();
        return res?.results?.bindings?.map((x: any): EtymologyDetails => {
            const wdURI = x.wikidata.value as string,
                wdQID = wdURI.replace("http://www.wikidata.org/entity/", "");
            return {
                birth_place: x.birth_place?.value,
                citizenship: x.citizenship?.value,
                commons: x.commons?.value,
                death_date: x.death_date?.value,
                death_date_precision: parseInt(x.death_date_precision?.value),
                death_place: x.death_place?.value,
                description: x.description?.value,
                end_date: x.end_date?.value,
                end_date_precision: parseInt(x.end_date_precision?.value),
                event_place: x.event_place?.value,
                name: x.name?.value,
                occupations: x.occupations?.value,
                pictures: x.pictures?.value?.split("||"),
                prizes: x.prizes?.value,
                wikipedia: x.wikipedia?.value,
                wkt_coords: x.wkt_coords?.value,
                wikidata: wdQID,
            };
        });
    }
}