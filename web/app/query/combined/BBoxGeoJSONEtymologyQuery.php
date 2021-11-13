<?php

namespace App\Query\Combined;

require_once(__DIR__ . "/../BBoxGeoJSONQuery.php");
require_once(__DIR__ . '/../../result/GeoJSONQueryResult.php');
require_once(__DIR__ . "/BBoxJSONOverpassWikidataQuery.php");
require_once(__DIR__ . "/../wikidata/GeoJSON2GeoJSONEtymologyWikidataQuery.php");

use \App\Query\BBoxGeoJSONQuery;
use \App\Query\Combined\BBoxJSONOverpassWikidataQuery;
use \App\Query\Wikidata\GeoJSON2GeoJSONEtymologyWikidataQuery;
use \App\Result\QueryResult;
use \App\Result\JSONQueryResult;
use \App\Result\GeoJSONQueryResult;

/**
 * Combined query to Overpass and Wikidata.
 * It expects a bounding box and a language.
 * Fetches the objects in the given bounding box and its etymologies in the given language.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class BBoxGeoJSONEtymologyQuery extends BBoxJSONOverpassWikidataQuery implements BBoxGeoJSONQuery
{
    /**
     * @return GeoJSONQueryResult
     */
    protected function createResult(array $overpassGeoJSONData): JSONQueryResult
    {
        $wikidataQuery = new GeoJSON2GeoJSONEtymologyWikidataQuery($overpassGeoJSONData, $this->wikidataFactory);
        $wikidataResult = $wikidataQuery->send();
        return $wikidataResult;
    }

    /**
     * @return GeoJSONQueryResult
     */
    public function send(): QueryResult
    {
        $ret = parent::send();
        if (!($ret instanceof GeoJSONQueryResult)) {
            throw new \Exception("Result is not GeoJSONQueryResult");
        }
        return $ret;
    }
}
