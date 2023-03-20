<?php

declare(strict_types=1);

namespace App\Query\Overpass;


use \App\Config\Overpass\OverpassConfig;
use \App\Query\GeoJSONQuery;
use \App\Result\Overpass\OverpassEtymologyQueryResult;
use \App\Result\QueryResult;
use \App\Result\GeoJSONQueryResult;

/**
 * OverpassQL query that retrieves all the details of any item which has an etymology in the vicinity of a central point.
 */
class CenterEtymologyOverpassQuery extends OverpassQuery implements GeoJSONQuery
{
    private float $lat;
    private float $lon;
    private float $radius;
    private string $textTag;
    private string $descriptionTag;

    /**
     * @param array<string> $keys OSM wikidata keys to use
     */
    public function __construct(
        float $lat,
        float $lon,
        float $radius,
        OverpassConfig $config,
        string $textTag,
        string $descriptionTag,
        array $keys
    ) {
        parent::__construct(
            $keys,
            "around:$radius,$lat,$lon",
            "out body; >; out skel qt;",
            $config
        );
        $this->lat = $lat;
        $this->lon = $lon;
        $this->radius = $radius;
        $this->textTag = $textTag;
        $this->descriptionTag = $descriptionTag;
    }

    /**
     * @return float
     */
    public function getCenterLat(): float
    {
        return $this->lat;
    }

    /**
     * @return float
     */
    public function getCenterLon(): float
    {
        return $this->lon;
    }

    /**
     * @return float
     */
    public function getRadius(): float
    {
        return $this->radius;
    }

    public function send(): QueryResult
    {
        $res = $this->sendAndRequireResult();
        return new OverpassEtymologyQueryResult(
            $res->isSuccessful(),
            $res->getArray(),
            $this->textTag,
            $this->descriptionTag,
            $this->getKeys()
        );
    }

    public function sendAndGetGeoJSONResult(): GeoJSONQueryResult
    {
        $out = $this->send();
        if (!$out instanceof GeoJSONQueryResult)
            throw new \Exception("sendAndGetJSONResult(): can't get GeoJSON result");
        return $out;
    }
}
