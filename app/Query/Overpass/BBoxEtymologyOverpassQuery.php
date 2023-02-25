<?php

declare(strict_types=1);

namespace App\Query\Overpass;


use \App\BoundingBox;
use \App\Query\BaseQuery;
use \App\Query\Overpass\OverpassQuery;
use \App\Query\Overpass\BBoxOverpassQuery;
use \App\Query\Overpass\OverpassConfig;
use \App\Query\BBoxGeoJSONQuery;
use \App\Result\Overpass\OverpassEtymologyQueryResult;
use \App\Result\QueryResult;
use \App\Result\JSONQueryResult;
use \App\Result\GeoJSONQueryResult;

/**
 * OverpassQL query that retrieves all the details of any item in a bounding box which has an etymology.
 */
class BBoxEtymologyOverpassQuery extends BaseQuery implements BBoxGeoJSONQuery
{
    private BBoxOverpassQuery $baseQuery;
    private string $textKey;
    private string $descriptionKey;

    /**
     * @param array<string> $keys OSM wikidata keys to use
     */
    public function __construct(array $keys, BoundingBox $bbox, OverpassConfig $config, string $textKey, string $descriptionKey)
    {
        $maxElements = $config->getMaxElements();
        $limitClause = $maxElements === null ? ' ' : " $maxElements";
        $this->baseQuery = new BBoxOverpassQuery(
            $keys,
            $bbox,
            "out body $limitClause; >; out skel qt;",
            $config
        );
        $this->textKey = $textKey;
        $this->descriptionKey = $descriptionKey;
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
        return new OverpassEtymologyQueryResult(
            $res->isSuccessful(),
            $res->getArray(),
            $this->textKey,
            $this->descriptionKey,
            $this->baseQuery->getKeys()
        );
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
