<?php

declare(strict_types=1);

namespace App\Query\Wikidata\QueryBuilder;

class BaseEtymologyIDListWikidataQueryBuilder extends BaseIDListWikidataQueryBuilder
{
    protected function createQueryFromValidIDsString(string $wikidataValues, string $language): string
    {
        return "SELECT ?wikidata
                (SAMPLE(?instanceID) AS ?instanceID)
                (SAMPLE(?instance_name) AS ?instance)
                (SAMPLE(?genderID) AS ?genderID)
                (SAMPLE(?gender_name) AS ?gender)
            WHERE {
                VALUES ?wikidata { $wikidataValues }

                OPTIONAL { # instance of - https://www.wikidata.org/wiki/Property:P31
                    ?instanceID ^wdt:P31 ?wikidata;
                        rdfs:label ?instance_name.
                    FILTER(lang(?instance_name)='$language').
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
