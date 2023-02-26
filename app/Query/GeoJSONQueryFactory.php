<?php

declare(strict_types=1);

namespace App\Query;


use \App\Query\GeoJSONQuery;
use \App\StringSet;

/**
 * Factory class that can create GeoJSONQuery objects.
 */
interface GeoJSONQueryFactory
{
    public function create(StringSet $input): GeoJSONQuery;
}
