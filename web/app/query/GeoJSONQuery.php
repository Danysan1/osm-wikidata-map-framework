<?php

namespace App\Query;

require_once(__DIR__."/Query.php");
require_once(__DIR__."/../result/GeoJSONQueryResult.php");

use \App\Query\Query;
use \App\Result\GeoJSONQueryResult;

/**
 * A query that returns GeoJSON data.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
interface GeoJSONQuery extends Query
{
    /**
     * @return GeoJSONQueryResult
     */
    public function send(): GeoJSONQueryResult;
}
