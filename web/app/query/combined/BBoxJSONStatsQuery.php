<?php

namespace App\Query\Combined;

require_once(__DIR__ . '/../../result/JSONQueryResult.php');
require_once(__DIR__ . "/../wikidata/GeoJSON2JSONStatsWikidataQuery.php");

use \App\Query\Wikidata\GeoJSON2JSONStatsWikidataQuery;
use \App\Result\JSONQueryResult;

/**
 * Combined query to Overpass and Wikidata.
 * It expects a bounding box and a language.
 * Fetches the objects in the given bounding box and the stats in the given language.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class BBoxJSONStatsQuery extends BBoxJSONOverpassWikidataQuery
{

    protected function createResult(array $overpassGeoJSONData): JSONQueryResult
    {
        $wikidataQuery = new GeoJSON2JSONStatsWikidataQuery($overpassGeoJSONData, $this->wikidataFactory);
        $wikidataResult = $wikidataQuery->send();
        return $wikidataResult;
    }
}