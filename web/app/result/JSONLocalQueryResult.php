<?php

namespace App\Result;

require_once(__DIR__ . "/LocalQueryResult.php");
require_once(__DIR__ . "/JSONQueryResult.php");

use \App\Result\LocalQueryResult;
use \App\Result\JSONQueryResult;

/**
 * Locally generated JSON query result
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class JSONLocalQueryResult extends LocalQueryResult implements JSONQueryResult
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
        } elseif ($success && $result !== null && !is_string($result) && !is_array($result)) {
            throw new \Exception("Result must be a string or array");
        } elseif ($success && is_array($result) && empty($result["type"])) {
            throw new \Exception("Invalid JSON array");
        }
        parent::__construct($success, $result, $sourcePath);
    }

    public function getJSONData(): array
    {
        $res = $this->getResult();
        return is_array($res) ? $res : json_decode((string)$res);
    }

    public function getGeoJSONData(): array
    {
        return $this->getJSONData();
    }

    public function getArray(): array
    {
        return $this->getJSONData();
    }

    public function getJSON(): string
    {
        $res = $this->getResult();
        return is_array($res) ? json_encode($res) : (string)$res;
    }

    public function getGeoJSON(): string
    {
        return $this->getJSON();
    }
}
