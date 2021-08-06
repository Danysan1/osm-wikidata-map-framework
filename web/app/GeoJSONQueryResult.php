<?php
require_once(__DIR__."/QueryResult.php");

/**
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