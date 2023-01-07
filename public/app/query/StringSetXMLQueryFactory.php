<?php

namespace App\Query;

require_once(__DIR__ . "/StringSetXMLQuery.php");
require_once(__DIR__ . "/../StringSet.php");

use \App\Query\StringSetXMLQuery;
use \App\StringSet;

/**
 * Factory class that can create StringSetXMLQuery objects.
 */
interface StringSetXMLQueryFactory
{
    public function create(StringSet $input): StringSetXMLQuery;
}
