<?php

namespace App\Result;

require_once(__DIR__ . "/QueryResult.php");

use \App\Result\QueryResult;

/**
 * Query result whose content can be converted to JSON data.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
interface JSONQueryResult extends QueryResult
{
    /**
     * @return array
     */
    public function getJSONData(): array;

    /**
     * @return string
     */
    public function getJSON(): string;
}
