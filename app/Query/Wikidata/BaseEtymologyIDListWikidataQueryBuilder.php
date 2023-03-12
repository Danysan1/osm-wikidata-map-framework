<?php

declare(strict_types=1);

namespace App\Query\Wikidata;

/**
 * Wikidata SPARQL query which retrieves information about some items for which the ID is given.
 */
class BaseEtymologyIDListWikidataQueryBuilder
{
    public static function createQuery(string $wikidataIDList, string $language): string
    {
        return "SELECT ?wikidata
                (SAMPLE(?name) AS ?name)
                (SAMPLE(?description) AS ?description)
                (SAMPLE(?instanceID) AS ?instanceID)
                (SAMPLE(?instance_name) AS ?instance)
                (SAMPLE(?genderID) AS ?genderID)
                (SAMPLE(?gender_name) AS ?gender)
            WHERE {
                VALUES ?wikidata { $wikidataIDList }

                OPTIONAL { # instance of - https://www.wikidata.org/wiki/Property:P31
                    ?instanceID ^wdt:P31 ?wikidata;
                        rdfs:label ?instance_name.
                    FILTER(lang(?instance_name)='$language').
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
                    ?genderID ^wdt:P21 ?wikidata;
                        rdfs:label ?gender_name.
                    FILTER(lang(?gender_name)='$language').
                }
            }
            GROUP BY ?wikidata";
    }
}
