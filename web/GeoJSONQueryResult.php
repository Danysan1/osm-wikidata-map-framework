<?php
require_once("./QueryResult.php");

interface GeoJSONQueryResult extends QueryResult {
    /**
     * @return array<type:string>
     */
    public function getGeoJSONData();

    /**
     * @return string
     */
    public function getGeoJSON();
}