<?php

namespace App\Query;

require_once(__DIR__ . "/Query.php");
require_once(__DIR__ . "/../result/QueryResult.php");
require_once(__DIR__ . "/../result/XMLQueryResult.php");

use \App\Query\Query;
use \App\Result\QueryResult;
use \App\Result\XMLQueryResult;

/**
 * A query that returns XML data.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
interface XMLQuery extends Query
{
    public function send(): QueryResult;

    public function sendAndGetXMLResult(): XMLQueryResult;
}
