<?php

declare(strict_types=1);

namespace App\Query;


use \App\Query\StringSetQuery;
use \App\Query\XMLQuery;

/**
 * A query that returns a XML result for the given string set.
 */
interface StringSetXMLQuery extends StringSetQuery, XMLQuery
{
}
