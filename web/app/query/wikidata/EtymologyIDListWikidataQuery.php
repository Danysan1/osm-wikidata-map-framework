<?php

namespace App\Query\Wikidata;

require_once(__DIR__ . "/../../StringSet.php");
require_once(__DIR__ . "/../StringSetXMLQuery.php");
require_once(__DIR__ . "/POSTWikidataQuery.php");
require_once(__DIR__ . "/../../result/QueryResult.php");
require_once(__DIR__ . "/../../result/wikidata/WikidataEtymologyQueryResult.php");

use App\StringSet;
use App\Query\StringSetXMLQuery;
use \App\Query\Wikidata\POSTWikidataQuery;
use \App\Result\QueryResult;
use \App\Result\Wikidata\WikidataEtymologyQueryResult;

/**
 * Wikidata SPARQL query which retrieves information about some items for which the ID is given.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class EtymologyIDListWikidataQuery extends POSTWikidataQuery implements StringSetXMLQuery
{
    /**
     * @var StringSet
     */
    private $wikidataIDList;

    /**
     * @var string $language
     */
    private $language;

    /**
     * @return WikidataEtymologyQueryResult
     */
    public function send(): QueryResult
    {
        return WikidataEtymologyQueryResult::fromXMLResult(parent::send());
    }

    /**
     * @param StringSet $wikidataIDList
     * @param string $language
     * @param string $endpointURL
     */
    public function __construct(StringSet $wikidataIDList, $language, $endpointURL)
    {
        $this->wikidataIDList = $wikidataIDList;
        $this->language = $language;

        $wikidataValues = implode(' ', array_map(function ($id) {
            return "wd:$id";
        }, $wikidataIDList->toArray()));

        foreach ($wikidataIDList->toArray() as $wikidataID) {
            /**
             * @psalm-suppress DocblockTypeContradiction
             */
            if (!is_string($wikidataID) || !preg_match("/^Q[0-9]+$/", $wikidataID)) {
                throw new \Exception("Invalid Wikidata ID: $wikidataID");
            }
        }

        if (!preg_match("/^[a-z]{2}$/", $language)) {
            error_log("EtymologyIDListWikidataQuery: Invalid language code $language");
            throw new \Exception("Invalid language code, it must be two letters");
        }

        parent::__construct(
            "SELECT ?wikidata
                (SAMPLE(?name) AS ?name)
                (SAMPLE(?description) AS ?description)
                (SAMPLE(?instanceID) AS ?instanceID)
                (SAMPLE(?genderID) AS ?genderID)
                (SAMPLE(?gender_name) AS ?gender)
                (SAMPLE(?wikipedia) AS ?wikipedia)
                (SAMPLE(?commons) AS ?commons)
                (GROUP_CONCAT(DISTINCT ?occupation_name; SEPARATOR=', ') AS ?occupations)
                (GROUP_CONCAT(DISTINCT ?citizenship_name; SEPARATOR=', ') AS ?citizenship)
                (GROUP_CONCAT(DISTINCT ?picture; SEPARATOR='\t') AS ?pictures)
                (GROUP_CONCAT(DISTINCT ?prize_name; SEPARATOR=', ') AS ?prizes)
                (SAMPLE(?event_date_precision) AS ?event_date_precision)
                (SAMPLE(?start_date) AS ?start_date)
                (SAMPLE(?start_date_precision) AS ?start_date_precision)
                (SAMPLE(?end_date) AS ?end_date)
                (SAMPLE(?end_date_precision) AS ?end_date_precision)
                (SAMPLE(?birth_date) AS ?birth_date)
                (SAMPLE(?birth_date_precision) AS ?birth_date_precision)
                (SAMPLE(?death_date) AS ?death_date)
                (SAMPLE(?death_date_precision) AS ?death_date_precision)
                (GROUP_CONCAT(DISTINCT ?event_place_name; SEPARATOR=', ') AS ?event_place)
                (SAMPLE(?birth_place_name) AS ?birth_place)
                (SAMPLE(?death_place_name) AS ?death_place)
                (SAMPLE(?wkt_coords) AS ?wkt_coords)
            WHERE {
                VALUES ?wikidata { $wikidataValues }

                {
                    ?instanceID ^wdt:P31 ?wikidata.
                } UNION {
                    ?instanceID ^wdt:P279 ?wikidata.
                }

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
                    {
                        ?picture ^wdt:P18 ?wikidata # picture
                    } UNION {
                        ?picture ^wdt:P94 ?wikidata # coat of arms image
                    }
                }

                OPTIONAL {
                    ?genderID ^wdt:P21 ?wikidata;
                        rdfs:label ?gender_name.
                    FILTER(lang(?gender_name)='$language').
                }

                OPTIONAL {
                    ?wikidata p:P585/psv:P585 [
                        wikibase:timePrecision ?event_date_precision;
                        wikibase:timeValue ?event_date
                    ].
                    MINUS {
                        ?wikidata p:P585/psv:P585/wikibase:timePrecision ?other_event_date_precision.
                        FILTER (?other_event_date_precision > ?event_date_precision).
                    }.
                }

                OPTIONAL {
                    ?wikidata p:P580/psv:P580 [
                        wikibase:timePrecision ?start_date_precision;
                        wikibase:timeValue ?start_date
                    ].
                    MINUS {
                        ?wikidata p:P585/psv:P585/wikibase:timePrecision ?other_start_date_precision.
                        FILTER (?other_start_date_precision > ?start_date_precision).
                    }.
                }

                OPTIONAL {
                    ?wikidata p:P582/psv:P582 [
                        wikibase:timePrecision ?end_date_precision;
                        wikibase:timeValue ?end_date
                    ].
                    MINUS {
                        ?wikidata p:P585/psv:P585/wikibase:timePrecision ?other_end_date_precision.
                        FILTER (?other_end_date_precision > ?end_date_precision).
                    }.
                }

                OPTIONAL {
                    ?wikidata p:P569/psv:P569 [
                        wikibase:timePrecision ?birth_date_precision;
                        wikibase:timeValue ?birth_date
                    ].
                    MINUS {
                        ?wikidata p:P585/psv:P585/wikibase:timePrecision ?other_birth_date_precision.
                        FILTER (?other_birth_date_precision > ?birth_date_precision).
                    }.
                }

                OPTIONAL {
                    ?wikidata p:P570/psv:P570 [
                        wikibase:timePrecision ?death_date_precision;
                        wikibase:timeValue ?death_date
                    ].
                    MINUS {
                        ?wikidata p:P585/psv:P585/wikibase:timePrecision ?other_death_date_precision.
                        FILTER (?other_death_date_precision > ?death_date_precision).
                    }.
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
                    FILTER(lang(?prize_name)='$language').
                }

                OPTIONAL {
                    ?wkt_coords ^wdt:P625 ?wikidata.
                    FILTER(STRSTARTS(?wkt_coords, 'Point')).
                }

                OPTIONAL {
                    ?citizenship_name ^rdfs:label/^wdt:P27 ?wikidata.
                    FILTER(lang(?citizenship_name)='$language').
                }
            }
            GROUP BY ?wikidata",
            $endpointURL
        );
    }

    /**
     * @return StringSet
     */
    public function getStringSet(): StringSet
    {
        return $this->wikidataIDList;
    }

    /**
     * @return string
     */
    public function getLanguage(): string
    {
        return $this->language;
    }
}
