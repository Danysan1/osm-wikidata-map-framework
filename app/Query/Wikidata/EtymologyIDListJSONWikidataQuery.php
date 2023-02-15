<?php

declare(strict_types=1);

namespace App\Query\Wikidata;


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
