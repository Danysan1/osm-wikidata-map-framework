<?php

namespace App\Query\Wikidata;

require_once(__DIR__ . "/StringSetXMLWikidataQuery.php");
require_once(__DIR__ . "/../../result/wikidata/XMLWikidataStatsQueryResult.php");

use \App\Query\Wikidata\StringSetXMLWikidataQuery;
use \App\Result\QueryResult;
use \App\Result\Wikidata\XMLWikidataStatsQueryResult;

/**
 * Wikidata SPARQL query which retrieves statistics on the type of some items for which the ID is given.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class TypeStatsWikidataQuery extends StringSetXMLWikidataQuery
{
    /**
     * @return XMLWikidataStatsQueryResult
     */
    public function send(): QueryResult
    {
        return XMLWikidataStatsQueryResult::fromXMLResult(parent::send());
    }

    public function createQuery(string $wikidataIDList, string $language): string
    {
        return
            "SELECT ?name
                (COUNT(*) AS ?count)
            WHERE {
                VALUES ?wikidata { $wikidataIDList }
            
                OPTIONAL {
                    ?instanceID ^wdt:P21 ?wikidata;
                        rdfs:label ?name.
                    FILTER(lang(?name)='$language').
                }
            }
            GROUP BY ?name
            ORDER BY ?name";
    }
}
