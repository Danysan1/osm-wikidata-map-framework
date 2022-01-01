<?php

namespace App\Query;

require_once(__DIR__ . "/Query.php");
require_once(__DIR__ . "/../result/QueryResult.php");
require_once(__DIR__ . "/../result/JSONQueryResult.php");

use \App\Query\Query;
use \App\Result\QueryResult;
use \App\Result\JSONQueryResult;

/**
 * A query that returns JSON data.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
interface JSONQuery extends Query
{
    public function send(): QueryResult;

    public function sendAndGetJSONResult(): JSONQueryResult;
}
