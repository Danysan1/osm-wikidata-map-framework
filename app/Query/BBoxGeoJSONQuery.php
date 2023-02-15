<?php

declare(strict_types=1);

namespace App\Query;


use \App\Query\BBoxJSONQuery;
use \App\Query\GeoJSONQuery;

/**
 * A query that returns a GeoJSON FeatureCollection of the features with the expected characteristics inside the given bounding box.
 */
interface BBoxGeoJSONQuery extends BBoxJSONQuery, GeoJSONQuery
{
}
