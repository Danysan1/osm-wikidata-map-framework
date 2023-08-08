<?php

declare(strict_types=1);

namespace App\Query\Wikidata;


use \App\Query\Wikidata\StringSetXMLWikidataQuery;
use \App\Result\XMLQueryResult;
use \App\Result\Wikidata\XMLWikidataEtymologyQueryResult;

/**
 * Wikidata SPARQL query which retrieves information about some items for which the ID is given.
 */
class EtymologyIDListXMLWikidataQuery extends StringSetXMLWikidataQuery
{
    public function sendAndGetXMLResult(): XMLQueryResult
    {
        return XMLWikidataEtymologyQueryResult::fromXMLResult(parent::sendAndGetXMLResult());
    }
}
