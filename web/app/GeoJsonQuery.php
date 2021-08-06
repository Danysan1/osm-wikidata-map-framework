<?php
require_once(__DIR__."/Query.php");
require_once(__DIR__."/GeoJSONQueryResult.php");

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
interface GeoJSONQuery extends Query {
    /**
     * @return GeoJSONQueryResult
     */
    public function send();
}