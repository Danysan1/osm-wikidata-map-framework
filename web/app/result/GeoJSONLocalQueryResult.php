<?php

namespace App\Result;

require_once(__DIR__ . '/JSONLocalQueryResult.php');
require_once(__DIR__ . '/GeoJSONQueryResult.php');

use App\Result\JSONLocalQueryResult;
use App\Result\GeoJSONQueryResult;

class GeoJSONLocalQueryResult extends JSONLocalQueryResult implements GeoJSONQueryResult
{
    public function getGeoJSON(): string
    {
        return $this->getJSON();
    }

    public function getGeoJSONData(): array
    {
        return $this->getJSONData();
    }
}
