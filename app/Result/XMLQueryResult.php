<?php

declare(strict_types=1);

namespace App\Result;


use \App\Result\QueryResult;
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
