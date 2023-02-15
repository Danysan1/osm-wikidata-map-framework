<?php

declare(strict_types=1);

namespace App\Query;


use \App\Query\StringSetQuery;
use \App\Query\JSONQuery;

/**
 * A query that returns a JSON result for the given string set.
 */
interface StringSetJSONQuery extends StringSetQuery, JSONQuery
{
}
