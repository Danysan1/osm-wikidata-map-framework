<?php
require_once("./BaseRemoteQueryResult.php");
require_once("./XMLQueryResult.php");

class XMLRemoteQueryResult extends BaseRemoteQueryResult implements XMLQueryResult
{
    /**
     * @return boolean
     */
    public function hasResult()
    {
        return $this->hasBody() && $this->isXML();
    }

    /**
     * @return SimpleXMLElement
     */
    public function getSimpleXMLElement()
    {
        if ($this->hasBody()) {
            throw new Exception("XMLRemoteQueryResult::getSimpleXMLElement: No response available, can't parse");
        }
        if (!$this->isXML()) {
            throw new Exception("XMLRemoteQueryResult::getSimpleXMLElement: Not a valid JSON response, can't parse");
        }

        $out = simplexml_load_string($this->body);
        if (!$out) {
            throw new Exception('Could not parse XML body');
        }
        //error_log($out->saveXML());

        return $out;
    }

    /**
     * @return array
     */
    public function getResult()
    {
        $obj = json_decode(json_encode($this->getSimpleXMLElement()), true);

        if ($obj === NULL || $obj === FALSE) {
            throw new Exception('Could not convert XML body');
        } else {
            assert(is_array($obj));
        }

        return $obj;
    }
}
