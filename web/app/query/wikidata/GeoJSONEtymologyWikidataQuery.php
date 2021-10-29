<?php

namespace App\Query\Wikidata;

require_once(__DIR__ . "/../GeoJSONQuery.php");
require_once(__DIR__ . "/../StringSetXMLQueryFactory.php");
require_once(__DIR__ . "/GeoJSONInputEtymologyWikidataQuery.php");
require_once(__DIR__ . "/../../result/QueryResult.php");
require_once(__DIR__ . "/../../result/GeoJSONQueryResult.php");
require_once(__DIR__ . "/../../result/GeoJSONLocalQueryResult.php");
require_once(__DIR__ . "/../../result/wikidata/WikidataEtymologyQueryResult.php");

use \App\Query\GeoJSONQuery;
use \App\Query\StringSetXMLQueryFactory;
use \App\Query\Wikidata\GeoJSONInputEtymologyWikidataQuery;
use \App\Result\QueryResult;
use \App\Result\GeoJSONQueryResult;
use \App\Result\GeoJSONLocalQueryResult;
use \App\Result\Wikidata\WikidataEtymologyQueryResult;

/**
 * Wikidata query that takes in input a GeoJSON etymologies object and gathers the information for its features.
 * The GeoJSON must be a feature collection where each feature has the property "etymology" which is an array of associative arrays where the field "id" contains the Wikidata IDs.
 * The query will then gather the information for each of the Wikidata IDs and add it to the feature.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class GeoJSONEtymologyWikidataQuery implements GeoJSONQuery
{
    /** @var GeoJSONInputEtymologyWikidataQuery $wikidataQuery */
    private $wikidataQuery;

    /**
     * @param array $geoJSONData
     * @param StringSetXMLQueryFactory $queryFactory
     */
    public function __construct($geoJSONData, $queryFactory)
    {
        $this->wikidataQuery = new GeoJSONInputEtymologyWikidataQuery($geoJSONData, $queryFactory);
    }

    public function getQuery(): string
    {
        return $this->wikidataQuery->getQuery();
    }

    /**
     * @return GeoJSONQueryResult
     */
    public function send(): QueryResult
    {
        $response = $this->wikidataQuery->send();
        if (!$response->hasResult()) {
            throw new \Exception("Wikidata query did not return any results");
        } elseif (!$response->isSuccessful()) {
            throw new \Exception("Wikidata query did not return successful response");
        } else {
            $geoJSONData = $this->wikidataQuery->getGeoJSONInputData();
            $wikidataResponse = WikidataEtymologyQueryResult::fromXMLResult($response);
            $matrixData = $wikidataResponse->getMatrixData();

            if (!is_array($geoJSONData["features"])) {
                throw new \Exception("GeoJSON features is not an array");
            } else {
                $numFeatures = count($geoJSONData["features"]);
                //error_log("Number of features: " . $numFeatures);
                for ($i = 0; $i < $numFeatures; $i++) {
                    if (empty($geoJSONData["features"][$i]["properties"]["etymologies"])) {
                        throw new \Exception("GeoJSON feature has no etymologies");
                    } else {
                        $etymologies = $geoJSONData["features"][$i]["properties"]["etymologies"];
                        if (!is_array($etymologies)) {
                            throw new \Exception("GeoJSON feature etymologies is not an array");
                        } else {
                            $numEtymologies = count($etymologies);
                            //error_log("Number of etymologies: " . $numEtymologies);
                            for ($j = 0; $j < $numEtymologies; $j++) {
                                $wikidataID = (string)$etymologies[$j]["id"];
                                $fullWikidataID = "http://www.wikidata.org/entity/$wikidataID";
                                //error_log("Wikidata ID: " . $fullWikidataID);
                                $found = false;
                                foreach ($matrixData as $row) {
                                    //error_log($row["wikidata"]);
                                    if ($row["wikidata"] == $fullWikidataID) {
                                        $found = true;
                                        $geoJSONData["features"][$i]["properties"]["etymologies"][$j] = $row;
                                    }
                                }
                                if (!$found) {
                                    error_log("Etymology information not found for $wikidataID");
                                }
                            }
                        }
                    }
                }
            }
            $out = new GeoJSONLocalQueryResult(true, $geoJSONData);
        }

        return $out;
    }

    public function __toString(): string
    {
        return "GeoJSONEtymologyWikidataQuery";
    }
}
