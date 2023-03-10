<?php

declare(strict_types=1);

namespace App\Query\Overpass\Stats;


use \App\BoundingBox;
use \App\Query\BaseQuery;
use \App\Query\Overpass\BBoxOverpassQuery;
use \App\Config\Overpass\OverpassConfig;
use \App\Query\BBoxJSONQuery;
use \App\Query\Overpass\OverpassQuery;
use \App\Result\Overpass\OverpassSourceStatsQueryResult;
use \App\Result\QueryResult;
use \App\Result\JSONQueryResult;

class BBoxSourceStatsOverpassQuery extends BaseQuery implements BBoxJSONQuery
{
    private BBoxOverpassQuery $baseQuery;

    /**
     * @param array<string> $keys OSM wikidata keys to use
     */
    public function __construct(array $keys, BoundingBox $bbox, OverpassConfig $config)
    {
        $this->baseQuery = new BBoxOverpassQuery(
            $keys,
            $bbox,
            'out ids;',
            $config
        );
    }

    public function send(): QueryResult
    {
        return $this->sendAndGetJSONResult();
    }

    public function sendAndGetJSONResult(): JSONQueryResult
    {
        return new OverpassSourceStatsQueryResult($this->baseQuery->sendAndRequireResult());
    }

    public function getBBox(): BoundingBox
    {
        return $this->baseQuery->getBBox();
    }

    public function getQuery(): string
    {
        return $this->baseQuery->getQuery();
    }
}
