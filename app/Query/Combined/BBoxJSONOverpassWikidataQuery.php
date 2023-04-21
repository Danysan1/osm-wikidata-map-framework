<?php

declare(strict_types=1);

namespace App\Query\Combined;


use \App\BoundingBox;
use App\Query\BBoxGeoJSONQuery;
use \App\ServerTiming;
use \App\Query\BBoxJSONQuery;
use \App\Result\QueryResult;
use \App\Result\JSONQueryResult;
use \App\Query\StringSetXMLQueryFactory;

/**
 * Combined query to Overpass and Wikidata.
 * It expects a bounding box and a language.
 * Fetches the objects in the given bounding box and its etymologies in the given language.
 */
abstract class BBoxJSONOverpassWikidataQuery implements BBoxJSONQuery
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

        $overpassGeoJSON = $overpassResult->getGeoJSONData();
        $wikidataResult = $this->createResult($overpassGeoJSON);
        $out = $wikidataResult;
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

    protected abstract function createResult(array $overpassGeoJSONData): JSONQueryResult;

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
        $thisClassName = get_class($this);
        $thisStartPos = strrpos($thisClassName, "\\");
        $thisClass = substr($thisClassName, $thisStartPos ? $thisStartPos + 1 : 0); // class_basename();

        $baseQueryClass = $this->baseQuery->getQueryTypeCode();

        $factoryLanguage = $this->wikidataFactory->getLanguage();

        $factoryClassName = get_class($this->wikidataFactory);
        $factoryStartPos = strrpos($factoryClassName, "\\");
        $factoryClass = substr($factoryClassName, $factoryStartPos ? $factoryStartPos + 1 : 0);

        return $thisClass . "_" . $baseQueryClass . "_" . $factoryLanguage . "_" . $factoryClass;
    }

    public function __toString(): string
    {
        return get_class($this) . ": " . $this->baseQuery;
    }
}
