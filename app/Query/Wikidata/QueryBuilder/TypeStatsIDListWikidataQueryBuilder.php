<?php

declare(strict_types=1);

namespace App\Query\Wikidata\QueryBuilder;

class TypeStatsIDListWikidataQueryBuilder extends BaseIDListWikidataQueryBuilder
{
    protected function createQueryFromValidIDsString(string $wikidataValues, string $language): string
    {
        return "SELECT ?name ?id (COUNT(*) AS ?count) ('#3bb2d0' AS ?color)
            WHERE {
                VALUES ?wikidata { $wikidataValues }
            
                OPTIONAL {
                    {
                        ?id ^wdt:P31 ?wikidata.
                    } UNION {
                        ?id ^wdt:P279 ?wikidata.
                    }
                    ?id rdfs:label ?name.
                    FILTER(lang(?name)='$language').
                }
            }
            GROUP BY ?name ?id
            ORDER BY DESC(?count)";
    }
}
