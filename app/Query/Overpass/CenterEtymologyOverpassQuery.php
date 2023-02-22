<?php

declare(strict_types=1);

namespace App\Query\Overpass;


use \App\Query\Overpass\BaseOverpassQuery;
use \App\Query\Overpass\OverpassConfig;
use \App\Query\GeoJSONQuery;
use \App\Result\Overpass\OverpassEtymologyQueryResult;
use \App\Result\QueryResult;
use \App\Result\GeoJSONQueryResult;

/**
 * OverpassQL query that retrieves all the details of any item which has an etymology in the vicinity of a central point.
 */
class CenterEtymologyOverpassQuery extends BaseOverpassQuery implements GeoJSONQuery
{
    private float $lat;
    private float $lon;
    private float $radius;
    private string $textTag;
    private string $descriptionTag;

    public function __construct(
        float $lat,
        float $lon,
        float $radius,
        OverpassConfig $config,
        string $textTag,
        string $descriptionTag,
        array $wikidataTags
    ) {
        parent::__construct(
            $wikidataTags,
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
            $this->tags
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
