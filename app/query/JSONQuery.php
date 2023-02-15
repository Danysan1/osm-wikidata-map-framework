<?php

declare(strict_types=1);

namespace App\Query;


use \App\Query\Query;
use \App\Result\QueryResult;
use \App\Result\JSONQueryResult;

/**
 * A query that returns JSON data.
 */
interface JSONQuery extends Query
{
    public function send(): QueryResult;

    public function sendAndGetJSONResult(): JSONQueryResult;
}
