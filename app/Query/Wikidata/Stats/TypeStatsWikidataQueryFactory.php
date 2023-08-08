<?php

declare(strict_types=1);

namespace App\Query\Wikidata\Stats;

use App\Query\StringSetXMLQuery;
use App\StringSet;

class TypeStatsWikidataQueryFactory extends StatsWikidataQueryFactory
{
    public function create(StringSet $input): StringSetXMLQuery
    {
        return new TypeStatsWikidataQuery($input, $this->language, $this->config);
    }
}
