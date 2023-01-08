<?php

namespace App\Result;

require_once(__DIR__ . "/JSONQueryResult.php");

use \App\Result\JSONQueryResult;

/**
 * Query result whose content can be converted to GeoJSON data.
 */
interface GeoJSONQueryResult extends JSONQueryResult
{
    /**
     * @return array{type:string}
     */
    public function getGeoJSONData(): array;

    /**
     * @return string
     */
    public function getGeoJSON(): string;
}
