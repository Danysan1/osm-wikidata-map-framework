<?php
require_once(__DIR__."/POSTWikidataQuery.php");

/**
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
     * @param array $wikidataIDList
     * @param string $language
     * @param string $endpointURL
     */
    public function __construct($wikidataIDList, $language, $endpointURL) {
        $this->wikidataIDList = $wikidataIDList;
        $this->language = $language;
        
        $wikidataValues = implode(' ', array_map(function($id){return "wd:$id";}, $wikidataIDList));

        foreach($wikidataIDList as $wikidataID) {
            if(!is_string($wikidataID) || !preg_match("/^Q[0-9]+$/", $wikidataID)) {
                throw new Exception("Invalid Wikidata ID: $wikidataID");
            }
        }

        if(!preg_match("/^[a-z]{2}$/", $language)) {
            throw new Exception("Invalid language code, it must be two letters");
        }

        parent::__construct(
            "SELECT ?wikidata
                (SAMPLE(?name) AS ?name)
                (SAMPLE(?description) AS ?description)
                (SAMPLE(?gender_name) AS ?gender)
                (SAMPLE(?wikipedia) AS ?wikipedia)
                (GROUP_CONCAT(DISTINCT ?occupation_name;SEPARATOR=', ') AS ?occupations)
                (GROUP_CONCAT(DISTINCT ?picture;SEPARATOR='\t') AS ?pictures)
                (SAMPLE(?birth_date) AS ?birth_date)
                (SAMPLE(?death_date) AS ?death_date)
                (SAMPLE(?birth_place_name) AS ?birth_place)
                (SAMPLE(?death_place_name) AS ?death_place)
            WHERE {
                VALUES ?wikidata { $wikidataValues }

                ?wikidata rdfs:label ?name.
                FILTER(lang(?name)='$language').

                OPTIONAL {
                    ?wikidata schema:description ?description.
                    FILTER(lang(?description)='$language').
                }

                OPTIONAL {
                    ?wikidata wdt:P106 ?occupation.
                    ?occupation rdfs:label ?occupation_name.
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
                    ?wikidata wdt:P569 ?birth_date.
                }

                OPTIONAL {
                    ?wikidata wdt:P570 ?death_date.
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
