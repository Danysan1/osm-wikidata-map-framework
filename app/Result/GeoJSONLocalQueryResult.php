<?php

declare(strict_types=1);

namespace App\Result;


use \App\Result\JSONLocalQueryResult;
use \App\Result\GeoJSONQueryResult;

class GeoJSONLocalQueryResult extends JSONLocalQueryResult implements GeoJSONQueryResult
{
    /**
     * @param boolean $success
     * @param mixed $result
     * @param string|null $sourcePath
     */
    public function __construct($success, $result, $sourcePath = null)
    {
        if ($success && is_array($result) && empty($result["type"])) {
            error_log(get_class($this) . ": " . json_encode($result));
            throw new \Exception("GeoJSONLocalQueryResult: Invalid GeoJSON array");
        }
        parent::__construct($success, $result, $sourcePath);
    }

    public function getGeoJSON(): string
    {
        return $this->getJSON();
    }

    public function getGeoJSONData(): array
    {
        return $this->getJSONData();
    }
}
