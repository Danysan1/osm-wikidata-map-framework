<?php

declare(strict_types=1);

namespace App\Result;


use \App\Result\BaseRemoteQueryResult;
use \App\Result\JSONQueryResult;

/**
 * Result of a remote query which returns JSON data.
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
            error_log("Bad JSON: " . $this->getBody());
            throw new \Exception("JSONRemoteQueryResult::getResult: Not a valid JSON response, can't parse");
        }
        return $this->getBody();
    }
}
