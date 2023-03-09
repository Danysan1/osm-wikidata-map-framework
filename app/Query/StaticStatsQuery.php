<?php

declare(strict_types=1);

namespace App\Query;

use App\BoundingBox;
use \App\Query\BaseQuery;
use App\Result\JSONLocalQueryResult;
use \App\Result\QueryResult;
use \App\Result\JSONQueryResult;

class StaticStatsQuery extends BaseQuery implements BBoxJSONQuery
{
    private BBoxGeoJSONQuery $baseQuery;
    private string $name;
    private string $color;

    public function __construct(BBoxGeoJSONQuery $baseQuery, string $name, string $color)
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
        $baseQueryResult = $this->baseQuery->sendAndGetGeoJSONResult();
        if (!$baseQueryResult->isSuccessful()) {
            error_log("StaticStatsQuery: Unsuccesful base query");
            return $baseQueryResult;
        } else {
            $geoJSON = $baseQueryResult->getGeoJSONData();
            return new JSONLocalQueryResult(
                true,
                empty($geoJSON["features"]) ? [] : [[
                    "name" => $this->name,
                    "color" => $this->color,
                    "count" => count($geoJSON["features"])
                ]]
            );
        }
    }

    public function getBBox(): BoundingBox
    {
        return $this->baseQuery->getBBox();
    }

    public function getQuery(): string
    {
        return $this->baseQuery->getQuery();
    }

    public function getQueryTypeCode(): string
    {
        return parent::getQueryTypeCode() . "_" . $this->baseQuery->getQueryTypeCode();
    }
}
