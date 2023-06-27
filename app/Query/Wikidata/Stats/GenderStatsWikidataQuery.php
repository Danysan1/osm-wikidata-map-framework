<?php

declare(strict_types=1);

namespace App\Query\Wikidata\Stats;

use App\Config\Wikidata\WikidataConfig;
use App\Query\StringSetXMLQuery;
use App\Query\StringSetXMLQueryFactory;
use App\Query\Wikidata\QueryBuilder\GenderStatsIDListWikidataQueryBuilder;
use \App\Query\Wikidata\StringSetXMLWikidataQuery;
use \App\Result\XMLQueryResult;
use \App\Result\Wikidata\XMLWikidataStatsQueryResult;
use App\StringSet;

/**
 * Wikidata SPARQL query which retrieves statistics on the gender of some items for which the ID is given.
 */
class GenderStatsWikidataQuery extends StringSetXMLWikidataQuery
{
    public function __construct(StringSet $wikidataIDList, string $language, WikidataConfig $config)
    {
        parent::__construct(
            $wikidataIDList,
            $language,
            (new GenderStatsIDListWikidataQueryBuilder())->createQuery($wikidataIDList, $language),
            $config
        );
    }

    public function sendAndGetXMLResult(): XMLQueryResult
    {
        return XMLWikidataStatsQueryResult::fromXMLResult(parent::sendAndGetXMLResult());
    }

    public static function Factory(string $language, WikidataConfig $config): StringSetXMLQueryFactory
    {
        return new class($language, $config) extends StatsWikidataQueryFactory
        {
            public function create(StringSet $input): StringSetXMLQuery
            {
                return new GenderStatsWikidataQuery($input, $this->language, $this->config);
            }
        };
    }
}
