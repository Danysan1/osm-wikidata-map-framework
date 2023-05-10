<?php

declare(strict_types=1);

namespace App\Query\Wikidata;

use \App\Query\Query;

interface WikidataQuery extends Query
{
    public function getWikidataQuery(): string;
}
