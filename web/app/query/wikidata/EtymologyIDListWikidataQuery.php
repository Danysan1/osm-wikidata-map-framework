<?php

namespace App\Query\Wikidata;

require_once(__DIR__."/POSTWikidataQuery.php");

use \App\Query\Wikidata\POSTWikidataQuery;

/**
 * Wikidata SPARQL query which retrieves information about some items for which the ID is given.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class EtymologyIDListWikidataQuery extends POSTWikidataQuery {
    /**
     * @var array<string>
     */
    private $wikidataIDList;

    /**
     * @var string $language
     */
    private $language;
    
    /**
     * @param array<string> $wikidataIDList
     * @param string $language
     * @param string $endpointURL
     */
    public function __construct($wikidataIDList, $language, $endpointURL) {
        $this->wikidataIDList = $wikidataIDList;
        $this->language = $language;
        
        $wikidataValues = implode(' ', array_map(function($id){return "wd:$id";}, $wikidataIDList));

        foreach($wikidataIDList as $wikidataID) {
            /**
             * @psalm-suppress DocblockTypeContradiction
             */
            if(!is_string($wikidataID) || !preg_match("/^Q[0-9]+$/", $wikidataID)) {
                throw new \Exception("Invalid Wikidata ID: $wikidataID");
            }
        }

        if(!preg_match("/^[a-z]{2}$/", $language)) {
            throw new \Exception("Invalid language code, it must be two letters");
        }

        parent::__construct(
            "SELECT ?wikidata
                (COALESCE(SAMPLE(?name),SAMPLE(?all_names)) AS ?name)
                (SAMPLE(?description) AS ?description)
                (SAMPLE(?gender_name) AS ?gender)
                (SAMPLE(?wikipedia) AS ?wikipedia)
                (SAMPLE(?commons) AS ?commons)
                (GROUP_CONCAT(DISTINCT ?occupation_name;SEPARATOR=', ') AS ?occupations)
                (GROUP_CONCAT(DISTINCT ?citizenship_name;SEPARATOR=', ') AS ?citizenship)
                (GROUP_CONCAT(DISTINCT ?picture;SEPARATOR='\t') AS ?pictures)
                (GROUP_CONCAT(DISTINCT ?prize_name;SEPARATOR=', ') AS ?prizes)
                (SAMPLE(?event_date) AS ?event_date)
                (SAMPLE(?birth_date) AS ?birth_date)
                (SAMPLE(?death_date) AS ?death_date)
                (SAMPLE(?event_place_name) AS ?event_place)
                (SAMPLE(?birth_place_name) AS ?birth_place)
                (SAMPLE(?death_place_name) AS ?death_place)
            WHERE {
                VALUES ?wikidata { $wikidataValues }

                OPTIONAL {
                    ?wikidata rdfs:label ?name.
                    FILTER(lang(?name)='$language').
                }

                ?wikidata rdfs:label ?all_names.

                OPTIONAL {
                    ?wikidata schema:description ?description.
                    FILTER(lang(?description)='$language').
                }

                OPTIONAL {
                    ?wikidata wdt:P106 ?occupation.
                    {
                        ?wikidata wdt:P21 ?gender.
                        FILTER(?gender IN (wd:Q6581072, wd:Q1052281)). # female / transgender female
                        #?occupation wdt:P2521 []. # female form of occupation is available
                        ?occupation wdt:P2521 ?occupation_name. # female form of occupation label
                    } UNION {
                        ?wikidata wdt:P21 ?gender.
                        FILTER(?gender IN (wd:Q6581072, wd:Q1052281)). # female / transgender female
                        MINUS {
                            ?occupation wdt:P2521 ?occupation_name.
                            FILTER(lang(?occupation_name)='$language').
                        }. # female form of occupation is NOT available in this language
                        ?occupation rdfs:label ?occupation_name. # base occupation label
                    } UNION {
                        ?wikidata wdt:P21 ?gender.
                        FILTER(?gender NOT IN (wd:Q6581072, wd:Q1052281)). # NOT female / transgender female
                        #?occupation wdt:P3321 []. # male form of occupation is available
                        ?occupation wdt:P3321 ?occupation_name. # male form of occupation label
                    } UNION {
                        ?wikidata wdt:P21 ?gender.
                        FILTER(?gender NOT IN (wd:Q6581072, wd:Q1052281)). # NOT female / transgender female
                        MINUS {
                            ?occupation wdt:P3321 ?occupation_name.
                            FILTER(lang(?occupation_name)='$language').
                        }. # male form of occupation is NOT available in this language
                        ?occupation rdfs:label ?occupation_name. # male form of occupation label
                    } UNION {
                        ?occupation rdfs:label ?occupation_name. # base occupation label
                        MINUS { ?wikidata wdt:P21 []. } . # no gender specified
                    }
                    FILTER(lang(?occupation_name)='$language').
                }

                OPTIONAL {
                    ?wikidata wdt:P18 ?picture.
                }

                OPTIONAL {
                    ?wikidata wdt:P21 ?gender.
                    ?gender rdfs:label ?gender_name.
                    FILTER(lang(?gender_name)='$language').
                }

                OPTIONAL {
                    ?wikidata wdt:P585 ?event_date.
                }

                OPTIONAL {
                    ?wikidata wdt:P569 ?birth_date.
                }

                OPTIONAL {
                    ?wikidata wdt:P570 ?death_date.
                }

                OPTIONAL {
                    ?wikidata wdt:P276 ?event_place.
                    ?event_place rdfs:label ?event_place_name.
                    FILTER(lang(?event_place_name)='it').
                }

                OPTIONAL {
                    ?wikidata wdt:P19 ?birth_place.
                    ?birth_place rdfs:label ?birth_place_name.
                    FILTER(lang(?birth_place_name)='$language').
                }

                OPTIONAL {
                    ?wikidata wdt:P20 ?death_place.
                    ?death_place rdfs:label ?death_place_name.
                    FILTER(lang(?death_place_name)='$language').
                }

                OPTIONAL {
                    ?wikipedia schema:about ?wikidata;
                        schema:inLanguage ?wikipedia_lang;
                        schema:isPartOf [ wikibase:wikiGroup 'wikipedia' ].
                    FILTER(?wikipedia_lang = '$language').
                }

                OPTIONAL {
                    ?wikidata wdt:P373 ?commons.
                }

                OPTIONAL {
                    ?wikidata wdt:P166 ?prize. # awarded prize
                    {
                        ?prize wdt:P361 ?prize_group.
                        FILTER(?prize_group IN (wd:Q7191,wd:Q19020,wd:Q41254)). # Nobel, Academy (Oscar), Grammy
                    } UNION {
                        ?prize wdt:P31 wd:Q28444913. # Palme d'Or (Cannes)
                    } UNION {
                        ?prize wdt:P1027 wd:Q49024. # Golden Lion (Venice)
                    }
                    ?prize rdfs:label ?prize_name.
                    FILTER(lang(?prize_name)='$language').
                }

                OPTIONAL {
                    ?wikidata wdt:P27 ?citizenship.
                    ?citizenship rdfs:label ?citizenship_name.
                    FILTER(lang(?citizenship_name)='$language').
                }
            }
            GROUP BY ?wikidata",
            $endpointURL
        );
    }
    
    /**
     * @return array<string>
     */
    public function getWikidataIDList() {
        return $this->wikidataIDList;
    }

    /**
     * @return string
     */
    public function getLanguage() {
        return $this->language;
    }
}
