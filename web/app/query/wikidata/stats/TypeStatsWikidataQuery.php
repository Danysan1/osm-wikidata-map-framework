<?php

namespace App\Query\Wikidata\Stats;

require_once(__DIR__ . "/../StringSetXMLWikidataQuery.php");
require_once(__DIR__ . "/../../../result/wikidata/XMLWikidataStatsQueryResult.php");

use \App\Query\Wikidata\StringSetXMLWikidataQuery;
use \App\Result\XMLQueryResult;
use \App\Result\Wikidata\XMLWikidataStatsQueryResult;

/**
 * Wikidata SPARQL query which retrieves statistics on the type of some items for which the ID is given.
 */
class TypeStatsWikidataQuery extends StringSetXMLWikidataQuery
{
    public function sendAndGetXMLResult(): XMLQueryResult
    {
        return XMLWikidataStatsQueryResult::fromXMLResult(parent::sendAndGetXMLResult());
    }

    public function createQuery(string $wikidataIDList, string $language): string
    {
        return
            "SELECT ?name ?id (COUNT(*) AS ?count)
            WHERE {
                VALUES ?wikidata { $wikidataIDList }
            
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
