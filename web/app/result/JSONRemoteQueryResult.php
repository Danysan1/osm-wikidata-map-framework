<?php

namespace App\Result;

require_once(__DIR__."/BaseRemoteQueryResult.php");

use \App\Result\BaseRemoteQueryResult;

/**
 * Result of a remote query which returns JSON data.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class JSONRemoteQueryResult extends BaseRemoteQueryResult
{
    public function hasResult(): bool
    {
        return $this->hasBody() && $this->isJSON();
    }

    public function getArray(): array
    {
        //error_log("JSONRemoteQueryResult: ".$this->getResult());
        return (array)json_decode($this->getResult(), true);
    }

    public function getResult(): mixed
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
