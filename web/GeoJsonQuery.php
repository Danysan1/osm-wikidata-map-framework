<?php
require_once("./Query.php");
require_once("./GeoJSONQueryResult.php");

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
interface GeoJSONQuery extends Query {
    /**
     * @param string $endpoint
     * @return GeoJSONQueryResult
     */
    public function send($endpoint);
}