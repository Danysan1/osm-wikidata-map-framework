<?php

declare(strict_types=1);

namespace App\Query\Overpass;


use \App\BoundingBox;
use \App\Query\BaseQuery;
use \App\Query\Overpass\OverpassQuery;
use \App\Query\Overpass\BBoxOverpassQuery;
use \App\Config\Overpass\OverpassConfig;
use \App\Query\BBoxGeoJSONQuery;
use \App\Result\Overpass\OverpassCenterQueryResult;
use \App\Result\QueryResult;
use \App\Result\GeoJSONQueryResult;
use \App\Result\JSONQueryResult;

/**
 * OverpassQL query that retrieves only the centroid and the id of any item in a bounding box which has an etymology.
 */
class BBoxEtymologyCenterOverpassQuery extends BaseQuery implements BBoxGeoJSONQuery
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

    public function getQueryTypeCode(): string
    {
        return $this->baseQuery->getQueryTypeCode();
    }
}
