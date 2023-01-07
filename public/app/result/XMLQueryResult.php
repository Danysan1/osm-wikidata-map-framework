<?php

namespace App\Result;

require_once(__DIR__ . "/QueryResult.php");

use App\Result\QueryResult;
use SimpleXMLElement;

/**
 * Query result whose content can be converted to a SimpleXMLElement.
 * 
 * @see https://www.php.net/manual/en/class.simplexmlelement.php
 */
interface XMLQueryResult extends QueryResult
{
    /**
     * @return string
     */
    public function getXML(): string;
    /**
     * @return \SimpleXMLElement
     */
    public function getSimpleXMLElement(): SimpleXMLElement;
}
