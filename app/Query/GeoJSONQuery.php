<?php

declare(strict_types=1);

namespace App\Query;


use \App\Query\JSONQuery;
use \App\Result\QueryResult;
use \App\Result\GeoJSONQueryResult;

/**
 * A query that returns GeoJSON data.
 */
interface GeoJSONQuery extends JSONQuery
{
    public function send(): QueryResult;

    public function sendAndGetGeoJSONResult(): GeoJSONQueryResult;
}
