<?php

namespace App\Query;

require_once(__DIR__ . "/BBoxQuery.php");
require_once(__DIR__ . "/JSONQuery.php");

use \App\Query\BBoxQuery;
use \App\Query\JSONQuery;

/**
 * A query that returns a JSON data for the given bounding box.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
interface BBoxJSONQuery extends BBoxQuery, JSONQuery
{
}
