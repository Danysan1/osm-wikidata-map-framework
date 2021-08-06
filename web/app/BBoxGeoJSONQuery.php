<?php
require_once(__DIR__."/BBoxQuery.php");
require_once(__DIR__."/GeoJSONQuery.php");

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
interface BBoxGeoJSONQuery extends BBoxQuery,GeoJSONQuery {

}
