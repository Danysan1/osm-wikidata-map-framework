<?php

namespace App\Result;

require_once(__DIR__."/LocalQueryResult.php");
require_once(__DIR__."/XMLQueryResult.php");

use \App\Result\LocalQueryResult;
use \App\Result\XMLQueryResult;
use SimpleXMLElement;

/**
 * Locally generated XML query result
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class XMLLocalQueryResult extends LocalQueryResult implements XMLQueryResult
{
    /**
     * @param boolean $success
     * @param string $result
     */
    public function __construct($success, $result)
    {
        parent::__construct($success, $result, "application/xml");
    }

    /**
     * @return \SimpleXMLElement
     */
    public function getSimpleXMLElement(): SimpleXMLElement
    {
        $out = simplexml_load_string($this->getXML());
        if (!$out) {
            throw new \Exception('Could not parse XML body');
        }
        //error_log($out->saveXML());

        return $out;
    }

    public function getXML(): string
    {
        if (!$this->hasResult()) {
            throw new \Exception("XMLLocalQueryResult::getXML: No result available, can't get XML");
        }

        return parent::getResult();
    }

    public function getArray(): array
    {
        $obj = json_decode(json_encode($this->getSimpleXMLElement()), true);

        if ($obj === NULL || $obj === FALSE) {
            throw new \Exception('Could not convert XML body');
        } else {
            assert(is_array($obj));
        }

        return $obj;
    }
}
