<?php

namespace App\Result;

require_once(__DIR__."/QueryResult.php");

use \App\Result\QueryResult;

/**
 * Query result whose content can be converted to GeoJSON data.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
interface GeoJSONQueryResult extends QueryResult {
    /**
     * @return array{type:string}
     */
    public function getGeoJSONData();

    /**
     * @return string
     */
    public function getGeoJSON();
}