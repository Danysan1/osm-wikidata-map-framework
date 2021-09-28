<?php

namespace App\Query\Combined;

require_once(__DIR__ . '/../../BoundingBox.php');
require_once(__DIR__ . '/../../ServerTiming.php');
require_once(__DIR__ . "/../BBoxGeoJSONQuery.php");
require_once(__DIR__ . '/../../result/QueryResult.php');
require_once(__DIR__ . "/../overpass/BBoxEtymologyOverpassQuery.php");
require_once(__DIR__ . "/../overpass/OverpassConfig.php");
require_once(__DIR__ . "/../wikidata/GeoJSONEtymologyWikidataQuery.php");
require_once(__DIR__ . "/../StringSetXMLQueryFactory.php");

use \App\BoundingBox;
use \App\ServerTiming;
use \App\Query\BBoxGeoJSONQuery;
use \App\Query\Overpass\BBoxEtymologyOverpassQuery;
use \App\Query\Overpass\OverpassConfig;
use \App\Query\Wikidata\GeoJSONEtymologyWikidataQuery;
use \App\Result\QueryResult;
use \App\Query\StringSetXMLQueryFactory;

/**
 * Combined query to Overpass and Wikidata.
 * It expects a bounding box and a language.
 * Fetches the objects in the given bounding box and its etymologies in the given language.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class BBoxEtymologyOverpassWikidataQuery extends BBoxEtymologyOverpassQuery implements BBoxGeoJSONQuery
{
    /** @var ServerTiming $timing */
    private $timing;

    /** @var StringSetXMLQueryFactory $wikidataFactory */
    private $wikidataFactory;

    /**
     * @param BoundingBox $bbox
     * @param OverpassConfig $overpassConfig
     * @param StringSetXMLQueryFactory $wikidataFactory
     * @param ServerTiming $timing
     * @param boolean $nodes
     * @param boolean $ways
     * @param boolean $relations
     */
    public function __construct($bbox, $overpassConfig, $wikidataFactory, $timing)
    {
        //$this->overpassQuery = new BBoxEtymologyOverpassQuery($bbox, $overpassEndpointURL);
        parent::__construct($bbox, $overpassConfig);
        $this->timing = $timing;
        $this->wikidataFactory = $wikidataFactory;
    }

    public function send(): QueryResult
    {
        //$overpassResult = $this->overpassQuery->send();
        $overpassResult = parent::send();
        $this->timing->add("overpass_query");
        if (!$overpassResult->isSuccessful()) {
            error_log("BBoxEtymologyOverpassWikidataQuery: Overpass query failed: $overpassResult");
            throw new \Exception("Overpass query failed");
        } elseif (!$overpassResult->hasResult()) {
            throw new \Exception("Overpass query didn't return any result");
        }

        $overpassGeoJSON = $overpassResult->getGeoJSONData();
        if (empty($overpassGeoJSON["features"])) {
            $out = $overpassResult;
        } else {
            $wikidataQuery = new GeoJSONEtymologyWikidataQuery($overpassGeoJSON, $this->wikidataFactory);
            $wikidataResult = $wikidataQuery->send();
            $this->timing->add("wikidata_query");

            $out = $wikidataResult;
        }

        return $out;
    }
}
