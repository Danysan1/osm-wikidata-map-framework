<?php

namespace App\Result;

require_once(__DIR__ . "/LocalQueryResult.php");
require_once(__DIR__ . "/XMLQueryResult.php");

use \App\Result\LocalQueryResult;
use \App\Result\XMLQueryResult;
use SimpleXMLElement;

/**
 * Locally generated XML query result
 */
class XMLLocalQueryResult extends LocalQueryResult implements XMLQueryResult
{
    /**
     * @param boolean $success
     * @param mixed $result
     * @param string|null $sourcePath
     */
    public function __construct($success, $result, $sourcePath = null)
    {
        if ($success && empty($result) && empty($sourcePath)) {
            throw new \Exception("Empty result");
        }
        parent::__construct($success, $result, $sourcePath);
    }

    /**
     * @return \SimpleXMLElement
     */
    public function getSimpleXMLElement(): SimpleXMLElement
    {
        $out = @simplexml_load_string($this->getXML());
        if (!$out) {
            error_log("XMLLocalQueryResult: Error parsing XML - " . $this->getXML());
            throw new \Exception('Could not parse XML body');
        }
        //error_log($out->saveXML());

        return $out;
    }

    public function getXML(): string
    {
        if (!$this->hasResult()) {
            throw new \Exception("No result available, can't get XML");
        }

        return (string)parent::getResult();
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
