<?php

declare(strict_types=1);

namespace App\Result;


use \App\Result\JSONQueryResult;

/**
 * Query result whose content can be converted to GeoJSON data.
 */
interface GeoJSONQueryResult extends JSONQueryResult
{
    /**
     * @return array{type:string,features:array}
     */
    public function getGeoJSONData(): array;

    public function getGeoJSON(): string;
}
