<?php

namespace App\Query;

require_once(__DIR__ . "/StringSetQuery.php");
require_once(__DIR__ . "/XMLQuery.php");

use \App\Query\StringSetQuery;
use \App\Query\XMLQuery;

/**
 * A query that returns a XML result for the given string set.
 */
interface StringSetXMLQuery extends StringSetQuery, XMLQuery
{
}
