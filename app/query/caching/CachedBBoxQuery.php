<?php

namespace App\Query\Caching;

require_once(__DIR__ . "/CachedQuery.php");
require_once(__DIR__ . "/../BBoxQuery.php");

use \App\Query\Caching\CachedQuery;
use \App\Query\BBoxQuery;

/**
 * A query which searches objects in a given bounding box caching the result in a file.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
interface CachedBBoxQuery extends CachedQuery, BBoxQuery
{
}
