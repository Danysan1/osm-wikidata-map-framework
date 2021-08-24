<?php

namespace App\Query\Combined;

require_once(__DIR__ . '/../../BoundingBox.php');
require_once(__DIR__ . "/../BBoxGeoJSONQuery.php");
require_once(__DIR__ . '/../../result/QueryResult.php');
require_once(__DIR__ . "/../overpass/BBoxEtymologyOverpassQuery.php");
require_once(__DIR__ . "/../wikidata/GeoJSONEtymologyWikidataQuery.php");

use \App\BoundingBox;
use \App\Query\BBoxGeoJSONQuery;
use \App\Query\Overpass\BBoxEtymologyOverpassQuery;
use \App\Query\Wikidata\GeoJSONEtymologyWikidataQuery;
use \App\Result\QueryResult;

/**
 * Combined query to Overpass and Wikidata.
 * It expects a bounding box and a language.
 * Fetches the objects in the given bounding box and its etymologies in the given language.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class BBoxEtymologyOverpassWikidataQuery extends BBoxEtymologyOverpassQuery implements BBoxGeoJSONQuery
{
    /** @var BBoxEtymologyOverpassQuery $overpassQuery */
    //private $overpassQuery;

    /** @var string $language */
    private $language;

    /** @var string $wikidataEndpointURL */
    private $wikidataEndpointURL;

    /**
     * @param BoundingBox $bbox
     * @param string $overpassEndpointURL
     * @param string $wikidataEndpointURL
     * @param string $language
     */
    public function __construct($bbox, $overpassEndpointURL, $wikidataEndpointURL, $language)
    {
        //$this->overpassQuery = new BBoxEtymologyOverpassQuery($bbox, $overpassEndpointURL);
        parent::__construct($bbox, $overpassEndpointURL);

        $this->language = $language;
        $this->wikidataEndpointURL = $wikidataEndpointURL;
    }

    public function send(): QueryResult
    {
        //$overpassResult = $this->overpassQuery->send();
        $overpassResult = parent::send();
        if (!$overpassResult->isSuccessful()) {
            error_log("BBoxEtymologyOverpassWikidataQuery: Overpass query failed: $overpassResult");
            throw new \Exception("Overpass query failed");
        } elseif (!$overpassResult->hasResult()) {
            throw new \Exception("Overpass query didn't return any result");
        } else {
            $overpassGeoJSON = $overpassResult->getGeoJSONData();
            if (empty($overpassGeoJSON["features"])) {
                $out = $overpassResult;
            } else {
                $wikidataQuery = new GeoJSONEtymologyWikidataQuery($overpassGeoJSON, $this->language, $this->wikidataEndpointURL);
                $wikidataResult = $wikidataQuery->send();

                $out = $wikidataResult;
            }
        }

        return $out;
    }
}
