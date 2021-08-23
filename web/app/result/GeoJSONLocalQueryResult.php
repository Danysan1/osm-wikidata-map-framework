<?php

namespace App\Result;

require_once(__DIR__."/LocalQueryResult.php");
require_once(__DIR__."/GeoJSONQueryResult.php");

use \App\Result\LocalQueryResult;
use \App\Result\GeoJSONQueryResult;

/**
 * Locally generated GeoJSON query result
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class GeoJSONLocalQueryResult extends LocalQueryResult implements GeoJSONQueryResult
{
    /**
     * @param boolean $success
     * @param mixed $result
     */
    public function __construct($success, $result)
    {
        if ($success && $result !== null && (!is_array($result) || empty($result["type"]))) {
            throw new \Exception("Invalid GeoJSON result");
        }
        parent::__construct($success, $result);
    }

    public function getGeoJSONData(): array
    {
        return $this->getResult();
    }

    public function getArray(): array
    {
        return $this->getResult();
    }

    public function getGeoJSON(): string
    {
        return json_encode($this->getGeoJSONData());
    }
}
