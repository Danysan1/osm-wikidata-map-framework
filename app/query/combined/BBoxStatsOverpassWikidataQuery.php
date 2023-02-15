<?php

declare(strict_types=1);

namespace App\Query\Combined;


use \App\Query\Combined\BBoxJSONOverpassWikidataQuery;
use \App\Query\Wikidata\GeoJSON2JSONStatsWikidataQuery;
use \App\Result\JSONLocalQueryResult;
use \App\Result\JSONQueryResult;

/**
 * Combined query to Overpass and Wikidata.
 * It expects a bounding box and a language.
 * Fetches the objects in the given bounding box and the stats in the given language.
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
            $out = $wikidataQuery->sendAndGetJSONResult();
        }
        return $out;
    }
}
