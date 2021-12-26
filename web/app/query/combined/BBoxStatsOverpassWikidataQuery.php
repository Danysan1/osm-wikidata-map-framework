<?php

namespace App\Query\Combined;

require_once(__DIR__ . '/../../result/JSONQueryResult.php');
require_once(__DIR__ . '/../../result/JSONLocalQueryResult.php');
require_once(__DIR__ . "/../wikidata/GeoJSON2JSONStatsWikidataQuery.php");

use \App\Query\Wikidata\GeoJSON2JSONStatsWikidataQuery;
use App\Result\JSONLocalQueryResult;
use \App\Result\JSONQueryResult;

/**
 * Combined query to Overpass and Wikidata.
 * It expects a bounding box and a language.
 * Fetches the objects in the given bounding box and the stats in the given language.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class BBoxStatsOverpassWikidataQuery extends BBoxJSONOverpassWikidataQuery
{

    protected function createResult(array $overpassGeoJSONData): JSONQueryResult
    {
        if (!isset($overpassGeoJSONData["features"])) {
            throw new \Exception("Invalid GeoJSON data (no features array)");
        } elseif (empty($overpassGeoJSONData["features"])) {
            $out = new JSONLocalQueryResult(true, []);
        } else {
            $wikidataQuery = new GeoJSON2JSONStatsWikidataQuery($overpassGeoJSONData, $this->wikidataFactory);
            $out = $wikidataQuery->send();
        }
        return $out;
    }
}
