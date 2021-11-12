<?php

namespace App\Query\Wikidata;

require_once(__DIR__ . "/StringSetXMLWikidataQuery.php");

use \App\Query\Wikidata\StringSetXMLWikidataQuery;

/**
 * Wikidata SPARQL query which retrieves statistics on the gender of some items for which the ID is given.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class GenderStatsWikidataQuery extends StringSetXMLWikidataQuery
{
    public function createQuery(string $wikidataIDList, string $language): string
    {
        return 
            "SELECT ?gender_name
                (COUNT(*) AS ?count)
            WHERE {
                VALUES ?wikidata { $wikidataIDList }
            
                OPTIONAL {
                    ?genderID ^wdt:P21 ?wikidata;
                        rdfs:label ?gender_name.
                    FILTER(lang(?gender_name)='$language').
                }
            }
            GROUP BY ?gender_name";
    }
}
