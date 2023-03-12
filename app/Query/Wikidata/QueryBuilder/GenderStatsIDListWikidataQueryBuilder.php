<?php

declare(strict_types=1);

namespace App\Query\Wikidata\QueryBuilder;

class GenderStatsIDListWikidataQueryBuilder extends BaseIDListWikidataQueryBuilder
{
    protected function createQueryFromValidIDsString(string $wikidataValues, string $language): string
    {
        return "SELECT ?name ?id (COUNT(*) AS ?count) ('#3bb2d0' AS ?color)
            WHERE {
                VALUES ?wikidata { $wikidataValues }
            
                ?wikidata wdt:P31 wd:Q5
                OPTIONAL {
                    ?id ^wdt:P21 ?wikidata;
                        rdfs:label ?name.
                    FILTER(lang(?name)='$language').
                }
            }
            GROUP BY ?name ?id
            ORDER BY DESC(?count)";
    }
}
