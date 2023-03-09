<?php

declare(strict_types=1);

namespace App\Query\Overpass\Stats;

use \App\Query\BaseQuery;
use App\Query\GeoJSONQuery;
use App\Query\JSONQuery;
use App\Result\JSONLocalQueryResult;
use \App\Result\QueryResult;
use \App\Result\JSONQueryResult;

abstract class SourceStatsWikidataQuery extends BaseQuery implements JSONQuery
{
    private GeoJSONQuery $baseWikidataQuery;

    public function __construct(GeoJSONQuery $baseWikidataQuery)
    {
        $this->baseWikidataQuery = $baseWikidataQuery;
    }

    public function send(): QueryResult
    {
        return $this->sendAndGetJSONResult();
    }

    public function sendAndGetJSONResult(): JSONQueryResult
    {
        $wikidataQueryResult = $this->baseWikidataQuery->sendAndGetGeoJSONResult();
        $elements = $wikidataQueryResult->getArray()["features"];
        return new JSONLocalQueryResult(
            $wikidataQueryResult->isSuccessful(),
            empty($elements) ? [] : [["name" => "Wikidata", "color" => "#3399ff", "count" => count($elements)]]
        );
    }

    public function getQuery(): string
    {
        return $this->baseWikidataQuery->getQuery();
    }
}
