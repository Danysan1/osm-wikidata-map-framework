<?php

declare(strict_types=1);

namespace App\Query\Caching;


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
