<?php

namespace App\Query\Wikidata;

require_once(__DIR__ . "/StringSetJSONWikidataQuery.php");
require_once(__DIR__ . "/../../result/QueryResult.php");
require_once(__DIR__ . "/../../result/wikidata/XMLWikidataEtymologyQueryResult.php");

use \App\Query\Wikidata\StringSetJSONWikidataQuery;
use \App\Result\QueryResult;
use \App\Result\Wikidata\XMLWikidataEtymologyQueryResult;

/**
 * Wikidata SPARQL query which retrieves information about some items for which the ID is given.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class EtymologyIDListWikidataTextQuery extends StringSetJSONWikidataQuery
{
    public function createQuery(string $wikidataIDList, string $language): string
    {
        return "SELECT ?wikidata
                (SAMPLE(?name) AS ?name)
                (SAMPLE(?description) AS ?description)
                (SAMPLE(?gender_name) AS ?gender)
                (SAMPLE(?wikipedia) AS ?wikipedia)
                (GROUP_CONCAT(DISTINCT ?occupation_name; SEPARATOR=', ') AS ?occupations)
                (GROUP_CONCAT(DISTINCT ?citizenship_name; SEPARATOR=', ') AS ?citizenship)
                (GROUP_CONCAT(DISTINCT ?prize_name; SEPARATOR=', ') AS ?prizes)
                (GROUP_CONCAT(DISTINCT ?event_place_name; SEPARATOR=', ') AS ?event_place)
                (SAMPLE(?birth_place_name) AS ?birth_place)
                (SAMPLE(?death_place_name) AS ?death_place)
            WHERE {
                VALUES ?wikidata { $wikidataIDList }

                {
                    ?name ^rdfs:label ?wikidata.
                    FILTER(lang(?name)='$language').
                    OPTIONAL {
                        ?description ^schema:description ?wikidata.
                        FILTER(lang(?description)='$language').
                    }
                } UNION {
                    MINUS {
                        ?other_name ^rdfs:label ?wikidata.
                        FILTER(lang(?other_name)='$language').
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
                        FILTER(lang(?other_name)='$language' || lang(?other_name)='en').
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
                            FILTER(lang(?occupation_name)='$language').
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
                            FILTER(lang(?occupation_name)='$language').
                        }. # male form of occupation is NOT available in this language
                        ?gender ^wdt:P21 ?wikidata.
                        FILTER(?gender NOT IN (wd:Q6581072, wd:Q1052281)). # NOT female / transgender female
                        ?occupation_name ^rdfs:label ?occupation. # male form of occupation label
                    } UNION {
                        MINUS { ?wikidata wdt:P21 []. } . # no gender specified
                        ?occupation_name ^rdfs:label ?occupation. # base occupation label
                    }
                    FILTER(lang(?occupation_name)='$language').
                }

                OPTIONAL {
                    ?event_place_name ^rdfs:label/^wdt:P276 ?wikidata.
                    FILTER(lang(?event_place_name)='$language').
                }

                OPTIONAL {
                    ?birth_place_name ^rdfs:label/^wdt:P19 ?wikidata.
                    FILTER(lang(?birth_place_name)='$language').
                }

                OPTIONAL {
                    ?death_place_name ^rdfs:label/^wdt:P20 ?wikidata.
                    FILTER(lang(?death_place_name)='$language').
                }

                OPTIONAL {
                    ?wikipedia schema:about ?wikidata;
                        schema:inLanguage '$language';
                        schema:isPartOf [ wikibase:wikiGroup 'wikipedia' ].
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
                    FILTER(lang(?prize_name)='$language').
                }

                OPTIONAL {
                    ?citizenship_name ^rdfs:label/^wdt:P27 ?wikidata.
                    FILTER(lang(?citizenship_name)='$language').
                }
            }
            GROUP BY ?wikidata";
    }
}
