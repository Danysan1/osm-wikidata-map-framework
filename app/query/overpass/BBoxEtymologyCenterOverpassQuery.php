<?php

namespace App\Query\Overpass;

require_once(__DIR__ . "/../../BoundingBox.php");
require_once(__DIR__ . "/BBoxOverpassQuery.php");
require_once(__DIR__ . "/OverpassConfig.php");
require_once(__DIR__ . "/../BBoxGeoJSONQuery.php");
require_once(__DIR__ . "/../../result/overpass/OverpassCenterQueryResult.php");
require_once(__DIR__ . "/../../result/QueryResult.php");
require_once(__DIR__ . "/../../result/GeoJSONQueryResult.php");

use \App\BoundingBox;
use App\Query\BaseQuery;
use \App\Query\Overpass\BBoxOverpassQuery;
use \App\Query\Overpass\OverpassConfig;
use \App\Query\BBoxGeoJSONQuery;
use \App\Result\Overpass\OverpassCenterQueryResult;
use App\Result\QueryResult;
use \App\Result\GeoJSONQueryResult;
use App\Result\JSONQueryResult;

/**
 * OverpassQL query that retrieves only the centroid and the id of any item in a bounding box which has an etymology.
 */
class BBoxEtymologyCenterOverpassQuery extends BaseQuery implements BBoxGeoJSONQuery
{
    private BBoxOverpassQuery $baseQuery;

    public function __construct(BoundingBox $bbox, OverpassConfig $config)
    {
        $this->baseQuery = new BBoxOverpassQuery(
            ['name:etymology:wikidata', 'subject:wikidata', 'buried:wikidata'],
            $bbox,
            'out ids center;',
            $config
        );
    }

    public function send(): QueryResult
    {
        return $this->sendAndGetGeoJSONResult();
    }

    public function sendAndGetJSONResult(): JSONQueryResult
    {
        return $this->sendAndGetGeoJSONResult();
    }

    public function sendAndGetGeoJSONResult(): GeoJSONQueryResult
    {
        $res = $this->baseQuery->sendAndRequireResult();
        return new OverpassCenterQueryResult($res->isSuccessful(), $res->getArray());
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
