<?php

namespace App\Query\Wikidata;

require_once(__DIR__ . "/StringSetXMLWikidataQuery.php");
require_once(__DIR__ . "/../../result/QueryResult.php");
require_once(__DIR__ . "/../../result/wikidata/XMLWikidataEtymologyQueryResult.php");
require_once(__DIR__ . "/EtymologyIDListWikidataBaseQuery.php");

use \App\Query\Wikidata\StringSetXMLWikidataQuery;
use \App\Result\QueryResult;
use \App\Result\Wikidata\XMLWikidataEtymologyQueryResult;
use \App\Query\Wikidata\EtymologyIDListWikidataBaseQuery;

/**
 * Wikidata SPARQL query which retrieves information about some items for which the ID is given.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class EtymologyIDListXMLWikidataQuery extends StringSetXMLWikidataQuery
{
    /**
     * @return XMLWikidataEtymologyQueryResult
     */
    public function send(): QueryResult
    {
        return XMLWikidataEtymologyQueryResult::fromXMLResult(parent::send());
    }

    public function createQuery(string $wikidataIDList, string $language): string
    {
        return EtymologyIDListWikidataBaseQuery::createQuery($wikidataIDList, $language);
    }
}
