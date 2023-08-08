<?php

declare(strict_types=1);

namespace App\Query\Wikidata\Stats;

use App\Query\StringSetXMLQuery;
use App\StringSet;

class CountryStatsWikidataQueryFactory extends StatsWikidataQueryFactory
{
    public function create(StringSet $input): StringSetXMLQuery
    {
        return new CountryStatsWikidataQuery($input, $this->language, $this->config);
    }
}
