<?php

namespace App\Query;

require_once(__DIR__ . "/JSONQuery.php");
require_once(__DIR__ . "/../result/QueryResult.php");
require_once(__DIR__ . "/../result/GeoJSONQueryResult.php");

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
