<?php

declare(strict_types=1);

namespace App\Query;


use \App\Query\StringSetXMLQuery;
use \App\StringSet;

/**
 * Factory class that can create StringSetXMLQuery objects.
 */
interface StringSetXMLQueryFactory
{
    public function create(StringSet $input): StringSetXMLQuery;
}
