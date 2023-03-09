<?php

declare(strict_types=1);

namespace App\Query;

use \App\Query\BaseQuery;
use App\Query\GeoJSONQuery;
use App\Query\JSONQuery;
use App\Result\JSONLocalQueryResult;
use \App\Result\QueryResult;
use \App\Result\JSONQueryResult;

abstract class StaticStatsQuery extends BaseQuery implements JSONQuery
{
    private GeoJSONQuery $baseQuery;
    private string $name;
    private string $color;

    public function __construct(GeoJSONQuery $baseQuery, string $name, string $color)
    {
        $this->baseQuery = $baseQuery;
        $this->name = $name;
        $this->color = $color;
    }

    public function send(): QueryResult
    {
        return $this->sendAndGetJSONResult();
    }

    public function sendAndGetJSONResult(): JSONQueryResult
    {
        $wikidataQueryResult = $this->baseQuery->sendAndGetGeoJSONResult();
        $elements = $wikidataQueryResult->getArray()["features"];
        return new JSONLocalQueryResult(
            $wikidataQueryResult->isSuccessful(),
            empty($elements) ? [] : [
                ["name" => $this->name, "color" => $this->color, "count" => count($elements)]
            ]
        );
    }

    public function getQuery(): string
    {
        return $this->baseQuery->getQuery();
    }
}
