<?php

namespace App\Query\Wikidata;

require_once(__DIR__ . "/StringSetXMLWikidataQuery.php");
require_once(__DIR__ . "/../../result/XMLQueryResult.php");
require_once(__DIR__ . "/../../result/wikidata/XMLWikidataEtymologyQueryResult.php");
require_once(__DIR__ . "/EtymologyIDListWikidataQueryBuilder.php");

use \App\Query\Wikidata\StringSetXMLWikidataQuery;
use \App\Result\XMLQueryResult;
use \App\Result\Wikidata\XMLWikidataEtymologyQueryResult;
use \App\Query\Wikidata\EtymologyIDListWikidataQueryBuilder;

/**
 * Wikidata SPARQL query which retrieves information about some items for which the ID is given.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class EtymologyIDListXMLWikidataQuery extends StringSetXMLWikidataQuery
{
    public function sendAndGetXMLResult(): XMLQueryResult
    {
        return XMLWikidataEtymologyQueryResult::fromXMLResult(parent::sendAndGetXMLResult());
    }

    public function createQuery(string $wikidataIDList, string $language): string
    {
        return EtymologyIDListWikidataQueryBuilder::createQuery($wikidataIDList, $language);
    }
}
