<?php

namespace App\Query\Overpass\Stats;

require_once(__DIR__ . "/../../../BoundingBox.php");
require_once(__DIR__ . "/../BBoxOverpassQuery.php");
require_once(__DIR__ . "/../OverpassConfig.php");
require_once(__DIR__ . "/../../BBoxJSONQuery.php");
require_once(__DIR__ . "/../../../result/overpass/OverpassSourceStatsQueryResult.php");
require_once(__DIR__ . "/../../../result/QueryResult.php");

use \App\BoundingBox;
use App\Query\BaseQuery;
use \App\Query\Overpass\BBoxOverpassQuery;
use \App\Query\Overpass\OverpassConfig;
use \App\Query\BBoxJSONQuery;
use \App\Result\Overpass\OverpassSourceStatsQueryResult;
use App\Result\QueryResult;
use App\Result\JSONQueryResult;

class BBoxSourceStatsOverpassQuery extends BaseQuery implements BBoxJSONQuery
{
    private BBoxOverpassQuery $baseQuery;

    public function __construct(BoundingBox $bbox, OverpassConfig $config)
    {
        $this->baseQuery = new BBoxOverpassQuery(
            ['name:etymology:wikidata', 'subject:wikidata', 'buried:wikidata'],
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
