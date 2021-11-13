<?php

namespace App\Query\Combined;

require_once(__DIR__ . '/../../BoundingBox.php');
require_once(__DIR__ . '/../../ServerTiming.php');
require_once(__DIR__ . "/../BBoxJSONQuery.php");
require_once(__DIR__ . '/../../result/JSONQueryResult.php');
require_once(__DIR__ . "/../overpass/BBoxEtymologyOverpassQuery.php");
require_once(__DIR__ . "/../overpass/OverpassConfig.php");
require_once(__DIR__ . "/../wikidata/GeoJSON2JSONEtymologyWikidataQuery.php");
require_once(__DIR__ . "/../StringSetXMLQueryFactory.php");

use \App\BoundingBox;
use \App\ServerTiming;
use \App\Query\BBoxJSONQuery;
use \App\Query\Overpass\BBoxEtymologyOverpassQuery;
use \App\Query\Overpass\OverpassConfig;
use \App\Query\Wikidata\GeoJSON2JSONEtymologyWikidataQuery;
use \App\Result\QueryResult;
use \App\Result\JSONQueryResult;
use \App\Query\StringSetXMLQueryFactory;

/**
 * Combined query to Overpass and Wikidata.
 * It expects a bounding box and a language.
 * Fetches the objects in the given bounding box and its etymologies in the given language.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
abstract class BBoxJSONOverpassWikidataQuery implements BBoxJSONQuery
{
    /** @var ServerTiming $timing */
    protected $timing;

    /** @var BBoxEtymologyOverpassQuery $overpassQuery */
    private $overpassQuery;

    /** @var StringSetXMLQueryFactory $wikidataFactory */
    protected $wikidataFactory;

    /**
     * @param BoundingBox $bbox
     * @param OverpassConfig $overpassConfig
     * @param StringSetXMLQueryFactory $wikidataFactory
     * @param ServerTiming $timing
     */
    public function __construct($bbox, $overpassConfig, $wikidataFactory, $timing)
    {
        $this->overpassQuery = new BBoxEtymologyOverpassQuery($bbox, $overpassConfig);
        $this->timing = $timing;
        $this->wikidataFactory = $wikidataFactory;
    }

    /**
     * @return JSONQueryResult
     */
    public function send(): QueryResult
    {
        $overpassResult = $this->overpassQuery->send();
        $this->timing->add("overpass_query");
        if (!$overpassResult->isSuccessful()) {
            error_log("BBoxGeoJSONEtymologyQuery: Overpass query failed: $overpassResult");
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

    protected abstract function createResult(array $overpassGeoJSONData): JSONQueryResult;

    public function getBBox(): BoundingBox
    {
        return $this->overpassQuery->getBBox();
    }

    public function getQuery(): string
    {
        return $this->overpassQuery->getQuery();
    }

    public function getQueryTypeCode(): string
    {
        $thisClassName = get_class($this);
        $thisStartPos = strrpos($thisClassName, "\\");
        $thisClass = substr($thisClassName, $thisStartPos ? $thisStartPos + 1 : 0); // class_basename();
        $factoryClassName = get_class($this->wikidataFactory);
        $factoryStartPos = strrpos($factoryClassName, "\\");
        $factoryClass = substr($factoryClassName, $factoryStartPos ? $factoryStartPos + 1 : 0);
        return $thisClass . "_" . $factoryClass;
    }

    public function __toString(): string
    {
        return get_class($this) . ": " . $this->overpassQuery;
    }
}
