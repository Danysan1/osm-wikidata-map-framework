<?php

namespace App\Query;

require_once(__DIR__ . "/BBoxQuery.php");
require_once(__DIR__ . "/GeoJSONQuery.php");

use \App\Query\BBoxQuery;
use \App\Query\GeoJSONQuery;

/**
 * A query that returns a GeoJSON FeatureCollection of the features with the expected characteristics inside the given bounding box.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
interface BBoxGeoJSONQuery extends BBoxQuery, GeoJSONQuery
{
}
