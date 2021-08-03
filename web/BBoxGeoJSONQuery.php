<?php
require_once("./BBoxQuery.php");
require_once("./GeoJSONQuery.php");

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
interface BBoxGeoJSONQuery extends BBoxQuery,GeoJSONQuery {

}
