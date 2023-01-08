<?php

namespace App\Query;

require_once(__DIR__ . "/BBoxJSONQuery.php");
require_once(__DIR__ . "/GeoJSONQuery.php");

use \App\Query\BBoxJSONQuery;
use \App\Query\GeoJSONQuery;

/**
 * A query that returns a GeoJSON FeatureCollection of the features with the expected characteristics inside the given bounding box.
 */
interface BBoxGeoJSONQuery extends BBoxJSONQuery, GeoJSONQuery
{
}
