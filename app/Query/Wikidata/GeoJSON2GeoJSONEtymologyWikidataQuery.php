<?php

declare(strict_types=1);

namespace App\Query\Wikidata;


use \App\Query\GeoJSONQuery;
use \App\Query\Wikidata\GeoJSON2JSONEtymologyWikidataQuery;
use \App\Result\Overpass\OverpassEtymologyQueryResult;
use \App\Result\JSONQueryResult;
use \App\Result\GeoJSONQueryResult;
use \App\Result\GeoJSONLocalQueryResult;
use \App\Result\XMLQueryResult;
use \App\Result\Wikidata\XMLWikidataEtymologyQueryResult;

/**
 * Wikidata query that takes in input a GeoJSON etymologies object and gathers the information for its features.
 * The GeoJSON must be a feature collection where each feature has the property "etymology" which is an array of associative arrays where the field "id" contains the Wikidata IDs.
 * The query will then gather the information for each of the Wikidata IDs and add it to the feature.
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

    /**
     * @param (string|int|bool|array|null)[][] $matrixData
     * @return (string|int|bool|array|null)[]|null
     */
    private static function buildEtymologyFromID(string $wikidataID, array $matrixData): array|null
    {
        foreach ($matrixData as $row) {
            if ($row["wikidata"] == $wikidataID) {
                #error_log("Etymology information found for $wikidataID");
                return $row;
            }
        }

        //error_log("Etymology information NOT found for $wikidataID");
        return ["wikidata" => $wikidataID];
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
                    $props = (array)$geoJSONData["features"][$i]["properties"];
                    $etymologies = $props["etymologies"];
                    if (!is_array($etymologies)) {
                        throw new \Exception("GeoJSON feature etymologies is not an array");
                    } else {
                        $numEtymologies = count($etymologies);
                        //error_log("Number of etymologies: " . $numEtymologies);
                        for ($j = 0; $j < $numEtymologies; $j++) {
                            $wikidataID = (string)$etymologies[$j][OverpassEtymologyQueryResult::ETYMOLOGY_WD_ID_KEY];

                            $ety = self::buildEtymologyFromID($wikidataID, $matrixData);
                            if ($ety) {
                                $ety["from_osm"] = !empty($etymologies[$j]["from_osm"]);
                                if (!empty($etymologies[$j]["from_osm_type"]) && !empty($etymologies[$j]["from_osm_id"])) {
                                    $ety["from_osm_type"] = (string)$etymologies[$j]["from_osm_type"];
                                    $ety["from_osm_id"] = (int)$etymologies[$j]["from_osm_id"];
                                }

                                $ety["from_wikidata"] = !empty($etymologies[$j]["from_wikidata"]);
                                if (!empty($etymologies[$j]["from_wikidata_entity"]))
                                    $ety["from_wikidata_entity"] = $etymologies[$j]["from_wikidata_entity"];
                                if (!empty($etymologies[$j]["from_wikidata_prop"]))
                                    $ety["from_wikidata_prop"] = $etymologies[$j]["from_wikidata_prop"];
                            }
                            $geoJSONData["features"][$i]["properties"]["etymologies"][$j] = $ety;
                        }
                    }
                }
            }

            return new GeoJSONLocalQueryResult(true, $geoJSONData);
        }
    }
}
