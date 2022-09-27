<?php

namespace App\Query\Wikidata;

require_once(__DIR__ . "/GeoJSON2JSONEtymologyWikidataQuery.php");
require_once(__DIR__ . "/../../result/JSONLocalQueryResult.php");
require_once(__DIR__ . "/../../result/wikidata/XMLWikidataStatsQueryResult.php");

use \App\Query\Wikidata\GeoJSON2JSONEtymologyWikidataQuery;
use \App\Result\JSONQueryResult;
use \App\Result\JSONLocalQueryResult;
use \App\Result\XMLQueryResult;
use \App\Result\Wikidata\XMLWikidataStatsQueryResult;

/**
 * Wikidata query that takes in input a GeoJSON etymologies object and gathers the information for its features.
 * The GeoJSON must be a feature collection where each feature has the property "etymology" which is an array of associative arrays where the field "id" contains the Wikidata IDs.
 * The query will then gather the information for each of the Wikidata IDs and add it to the feature.
 */
class GeoJSON2JSONStatsWikidataQuery extends GeoJSON2JSONEtymologyWikidataQuery
{
    protected function createQueryResult(XMLQueryResult $wikidataResult): JSONQueryResult
    {
        $wikidataResponse = XMLWikidataStatsQueryResult::fromXMLResult($wikidataResult);
        $matrixData = $wikidataResponse->getMatrixData();
        return new JSONLocalQueryResult(true, $matrixData);
    }
}
