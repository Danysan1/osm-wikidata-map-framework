<?php

declare(strict_types=1);

namespace App\Query\Combined;


use \App\Query\BBoxGeoJSONQuery;
use \App\Query\Combined\BBoxJSONOverpassWikidataQuery;
use App\Query\StringSetXMLQueryFactory;
use \App\Query\Wikidata\GeoJSON2GeoJSONEtymologyWikidataQuery;
use \App\Result\GeoJSONLocalQueryResult;
use \App\Result\QueryResult;
use \App\Result\JSONQueryResult;
use \App\Result\GeoJSONQueryResult;
use App\ServerTiming;

/**
 * Combined query to Overpass and Wikidata.
 * It expects a bounding box and a language.
 * Fetches the objects in the given bounding box and its etymologies in the given language.
 */
class BBoxGeoJSONEtymologyQuery extends BBoxJSONOverpassWikidataQuery implements BBoxGeoJSONQuery
{
    public function __construct(BBoxGeoJSONQuery $baseQuery, StringSetXMLQueryFactory $wikidataFactory, ServerTiming $timing)
    {
        parent::__construct($baseQuery, $wikidataFactory, $timing);
    }

    protected function createResult(GeoJSONQueryResult $overpassResult): JSONQueryResult
    {
        $overpassGeoJSONData = $overpassResult->getGeoJSONData();
        if (!isset($overpassGeoJSONData["features"])) {
            throw new \Exception("Invalid GeoJSON data (no features array)");
        } elseif (empty($overpassGeoJSONData["features"])) {
            error_log("Empty features, returning directly input GeoJSON result");
            $out = $overpassResult;
        } else {
            $wikidataQuery = new GeoJSON2GeoJSONEtymologyWikidataQuery($overpassGeoJSONData, $this->wikidataFactory);
            $out = $wikidataQuery->sendAndGetGeoJSONResult();
        }
        return $out;
    }

    public function sendAndGetGeoJSONResult(): GeoJSONQueryResult
    {
        $out = $this->send();
        if (!$out instanceof GeoJSONQueryResult)
            throw new \Exception("sendAndGetGeoJSONResult(): can't get GeoJSON result");
        return $out;
    }
}
