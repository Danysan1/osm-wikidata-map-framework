<?php

namespace App\Query\Wikidata;

require_once(__DIR__ . "/StringSetJSONWikidataQuery.php");
require_once(__DIR__ . "/EtymologyIDListWikidataQueryBuilder.php");

use \App\Query\Wikidata\StringSetJSONWikidataQuery;
use \App\Query\Wikidata\EtymologyIDListWikidataQueryBuilder;

/**
 * Wikidata SPARQL query which retrieves information about some items for which the ID is given.
 */
class EtymologyIDListJSONWikidataQuery extends StringSetJSONWikidataQuery
{
    public function createQuery(string $wikidataIDList, string $language): string
    {
        return EtymologyIDListWikidataQueryBuilder::createQuery($wikidataIDList, $language);
    }
}
