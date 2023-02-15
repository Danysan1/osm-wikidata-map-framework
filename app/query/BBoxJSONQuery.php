<?php

declare(strict_types=1);

namespace App\Query;


use \App\Query\BBoxQuery;
use \App\Query\JSONQuery;

/**
 * A query that returns a JSON data for the given bounding box.
 */
interface BBoxJSONQuery extends BBoxQuery, JSONQuery
{
}
