<?php

namespace App\Result;

require_once(__DIR__."/BaseRemoteQueryResult.php");
require_once(__DIR__."/XMLQueryResult.php");

use \App\Result\BaseRemoteQueryResult;
use \App\Result\XMLQueryResult;
use SimpleXMLElement;

/**
 * Result of a remote query which returns XML data.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class XMLRemoteQueryResult extends BaseRemoteQueryResult implements XMLQueryResult
{
    /**
     * @return boolean
     */
    public function hasResult(): bool
    {
        return $this->hasBody() && $this->isXML();
    }

    /**
     * @return \SimpleXMLElement
     */
    public function getSimpleXMLElement(): SimpleXMLElement
    {
        if (!$this->hasBody()) {
            throw new \Exception("XMLRemoteQueryResult::getSimpleXMLElement: No response available, can't parse");
        }
        if (!$this->isXML()) {
            throw new \Exception("XMLRemoteQueryResult::getSimpleXMLElement: Not a valid XML response, can't parse");
        }

        $out = simplexml_load_string($this->getBody());
        if (!$out) {
            throw new \Exception('Could not parse XML body');
        }
        //error_log($out->saveXML());

        return $out;
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

    public function getXML(): string
    {
        if(!$this->hasBody() || !$this->isXML()) {
            throw new \Exception("XMLRemoteQueryResult::getXML: No response available, can't parse");
        }
        return $this->getBody();
    }

    public function getResult(): mixed
    {
        return $this->getXML();
    }
}
