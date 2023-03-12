<?php

declare(strict_types=1);

namespace App\Query\Wikidata\QueryBuilder;

use App\StringSet;

interface IDListWikidataQueryBuilder
{
    function createQuery(StringSet $wikidataIDs, string $language): string;
}
