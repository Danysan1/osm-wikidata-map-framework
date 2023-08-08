<?php

declare(strict_types=1);

namespace App\Query\Combined;


use \App\BoundingBox;
use App\Query\BaseQuery;
use App\Query\BBoxGeoJSONQuery;
use \App\ServerTiming;
use \App\Query\BBoxJSONQuery;
use \App\Result\QueryResult;
use \App\Result\JSONQueryResult;
use \App\Result\GeoJSONQueryResult;
use \App\Query\StringSetXMLQueryFactory;

/**
 * Combined query to Overpass and Wikidata.
 * It expects a bounding box and a language.
 * Fetches the objects in the given bounding box and its etymologies in the given language.
 */
abstract class BBoxJSONOverpassWikidataQuery extends BaseQuery implements BBoxJSONQuery
{
    protected ServerTiming $timing;
    private BBoxGeoJSONQuery $baseQuery;
    protected StringSetXMLQueryFactory $wikidataFactory;

    public function __construct(BBoxGeoJSONQuery $baseQuery, StringSetXMLQueryFactory $wikidataFactory, ServerTiming $timing)
    {
        $this->baseQuery = $baseQuery;
        $this->timing = $timing;
        $this->wikidataFactory = $wikidataFactory;
    }

    public function send(): QueryResult
    {
        $overpassResult = $this->baseQuery->sendAndGetGeoJSONResult();
        $this->timing->add("overpass_query");
        if (!$overpassResult->isSuccessful()) {
            error_log("BBoxJSONOverpassWikidataQuery: Overpass query failed: $overpassResult");
            throw new \Exception("Overpass query failed");
        } elseif (!$overpassResult->hasResult()) {
            throw new \Exception("Overpass query didn't return any result");
        }

        $out = $this->createResult($overpassResult);
        $this->timing->add("wikidata_query");

        return $out;
    }

    public function sendAndGetJSONResult(): JSONQueryResult
    {
        $ret = $this->send();
        if (!$ret instanceof JSONQueryResult) {
            error_log("BBoxJSONOverpassWikidataQuery: Result is not a JSONQueryResult but " . get_class($ret));
            throw new \Exception("Result is not a JSONQueryResult");
        }
        return $ret;
    }

    protected abstract function createResult(GeoJSONQueryResult $overpassResult): JSONQueryResult;

    public function getBBox(): BoundingBox
    {
        return $this->baseQuery->getBBox();
    }

    public function getQueryTypeCode(): string
    {
        $thisClass = parent::getQueryTypeCode();

        $baseQueryClass = $this->baseQuery->getQueryTypeCode();

        $factoryLanguage = $this->wikidataFactory->getLanguage();

        $factoryClass = $this->getSimplifiedClassName($this->wikidataFactory);

        return $thisClass . "_" . $baseQueryClass . "_" . $factoryLanguage . "_" . $factoryClass;
    }

    public function __toString(): string
    {
        return get_class($this) . ": " . $this->baseQuery;
    }

    /**
     * Color mapping from century to RGB
     * Red:   (-inf,5,9,13,17,21,inf) => (0,0,0,0,255,255,255)
     * Green: (-inf,5,9,13,17,21,inf) => (0,0,255,255,255,0,0)
     * Blue:  (-inf,5,9,13,17,21,inf) => (255,255,255,0,0,0,0)
     */
    public static function getCenturyColor(int $century): string
    {
        $red = (int)min(max(($century - 13) * 255 / 4, 0), 255);
        $green = (int)min(max(512 - (abs($century - 13) * 255 / 4), 0), 255);
        $blue = (int)min(max((13 - $century) * 255 / 4, 0), 255);
        return "rgb($red,$green,$blue)";
    }
}
