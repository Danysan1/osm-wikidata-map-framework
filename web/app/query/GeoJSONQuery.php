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
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
interface GeoJSONQuery extends JSONQuery
{
    /**
     * @return GeoJSONQueryResult
     */
    public function send(): QueryResult;
}
