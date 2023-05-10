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
class CenterEtymologyOverpassQuery extends BaseOverpassQuery implements GeoJSONQuery
{
    private string $textTag;
    private string $descriptionTag;
    private string $defaultLanguage;
    private ?string $language;

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
        array $keys,
        string $defaultLanguage,
        ?string $language = null
    ) {
        parent::__construct(
            $keys,
            "around:$radius,$lat,$lon",
            "out body; >; out skel qt;",
            $config
        );
        $this->textTag = $textTag;
        $this->descriptionTag = $descriptionTag;
        $this->defaultLanguage = $defaultLanguage;
        $this->language = $language;
    }

    public function send(): QueryResult
    {
        $res = $this->sendAndRequireResult();
        return new OverpassEtymologyQueryResult(
            $res->isSuccessful(),
            $res->getArray(),
            $this->textTag,
            $this->descriptionTag,
            $this->getKeys(),
            $this->defaultLanguage,
            $this->language,
            $this->getOverpassQlQuery()
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
