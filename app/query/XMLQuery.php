<?php

declare(strict_types=1);

namespace App\Query;


use \App\Query\Query;
use \App\Result\QueryResult;
use \App\Result\XMLQueryResult;

/**
 * A query that returns XML data.
 */
interface XMLQuery extends Query
{
    public function send(): QueryResult;

    public function sendAndGetXMLResult(): XMLQueryResult;
}
