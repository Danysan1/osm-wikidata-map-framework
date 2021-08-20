<?php

namespace App\Result;

require_once(__DIR__."/QueryResult.php");

use App\Result\QueryResult;

/**
 * Query result whose content can be converted to a SimpleXMLElement.
 * 
 * @see https://www.php.net/manual/en/class.simplexmlelement.php
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
interface XMLQueryResult extends QueryResult
{
    /**
     * @return \SimpleXMLElement
     */
    public function getSimpleXMLElement();
}
