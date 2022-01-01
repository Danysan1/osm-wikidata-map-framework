<?php

namespace App\Query\Wikidata;

require_once(__DIR__ . "/../GeoJSONQuery.php");
require_once(__DIR__ . "/GeoJSON2JSONEtymologyWikidataQuery.php");
require_once(__DIR__ . "/../../result/GeoJSONQueryResult.php");
require_once(__DIR__ . "/../../result/GeoJSONLocalQueryResult.php");
require_once(__DIR__ . "/../../result/wikidata/XMLWikidataEtymologyQueryResult.php");

use \App\Query\GeoJSONQuery;
use \App\Query\Wikidata\GeoJSON2JSONEtymologyWikidataQuery;
use \App\Result\QueryResult;
use \App\Result\JSONQueryResult;
use \App\Result\GeoJSONQueryResult;
use \App\Result\GeoJSONLocalQueryResult;
use \App\Result\XMLQueryResult;
use \App\Result\Wikidata\XMLWikidataEtymologyQueryResult;

/**
 * Wikidata query that takes in input a GeoJSON etymologies object and gathers the information for its features.
 * The GeoJSON must be a feature collection where each feature has the property "etymology" which is an array of associative arrays where the field "id" contains the Wikidata IDs.
 * The query will then gather the information for each of the Wikidata IDs and add it to the feature.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class GeoJSON2GeoJSONEtymologyWikidataQuery extends GeoJSON2JSONEtymologyWikidataQuery implements GeoJSONQuery
{
    public function sendAndGetGeoJSONResult(): GeoJSONQueryResult
    {
        $out = $this->send();
        if (!$out instanceof GeoJSONQueryResult)
            throw new \Exception("sendAndGetJSONResult(): can't get GeoJSON result");
        return $out;
    }

    protected function createQueryResult(XMLQueryResult $wikidataResult): JSONQueryResult
    {
        $wikidataResponse = XMLWikidataEtymologyQueryResult::fromXMLResult($wikidataResult);
        $geoJSONData = $this->wikidataQuery->getGeoJSONInputData();
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
                                $geoJSONData["features"][$i]["properties"]["etymologies"][$j] = null;
                            }
                        }
                    }
                }
            }

            return new GeoJSONLocalQueryResult(true, $geoJSONData);
        }
    }
}
