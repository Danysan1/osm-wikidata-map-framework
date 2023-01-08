<?php

namespace App\Query;

require_once(__DIR__ . "/StringSetQuery.php");
require_once(__DIR__ . "/JSONQuery.php");

use \App\Query\StringSetQuery;
use \App\Query\JSONQuery;

/**
 * A query that returns a JSON result for the given string set.
 */
interface StringSetJSONQuery extends StringSetQuery, JSONQuery
{
}
