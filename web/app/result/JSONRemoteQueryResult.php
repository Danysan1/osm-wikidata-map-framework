<?php

namespace App\Result;

require_once(__DIR__ . "/BaseRemoteQueryResult.php");
require_once(__DIR__ . "/JSONQueryResult.php");

use \App\Result\BaseRemoteQueryResult;
use \App\Result\JSONQueryResult;

/**
 * Result of a remote query which returns JSON data.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class JSONRemoteQueryResult extends BaseRemoteQueryResult implements JSONQueryResult
{
    public function hasResult(): bool
    {
        return $this->hasBody() && $this->isJSON();
    }

    public function getJSON(): string
    {
        return $this->getResult();
    }

    public function getJSONData(): array
    {
        //error_log("JSONRemoteQueryResult: ".$this->getResult());
        return (array)json_decode($this->getJSON(), true);
    }

    public function getArray(): array
    {
        return $this->getJSONData();
    }

    public function getResult()
    {
        if (!$this->hasBody()) {
            throw new \Exception("JSONRemoteQueryResult::getResult: No response available, can't parse");
        }
        if (!$this->isJSON()) {
            throw new \Exception("JSONRemoteQueryResult::getResult: Not a valid JSON response, can't parse");
        }
        return $this->getBody();
    }
}
