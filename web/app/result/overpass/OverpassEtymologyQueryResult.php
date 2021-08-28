<?php

namespace App\Result\Overpass;

require_once(__DIR__ . "/OverpassQueryResult.php");

use \App\Result\Overpass\OverpassQueryResult;

/**
 * Result of an Overpass query which can return multiple types of objects and etymology IDs must be separated.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class OverpassEtymologyQueryResult extends OverpassQueryResult
{
    /**
     * @param int $index
     * @param array $element
     * @param array $allElements
     * @return array|false
     */
    protected function convertElementToGeoJSONFeature($index, $element, $allElements)
    {
        if (empty($element["tags"]) || !is_array($element["tags"]) || empty($element["tags"]["name:etymology:wikidata"])) {
            $feature = false;
        } else {
            $elementID = (string)$element["type"] . "/" . (int)$element["id"];
            if (empty($element["tags"]["name"])) {
                $elementName = null;
                error_log("Abnormal element with etymology but no name: $elementID");
            } else {
                $elementName = (string)$element["tags"]["name"];
            }
            $feature = [
                "type" => "Feature",
                "geometry" => [],
                "properties" => ["name" => $elementName, "@id" => $elementID],
            ];

            //if(!empty($element["tags"]["name:etymology:wikidata"])) {
            $wikidataTag = (string)$element["tags"]["name:etymology:wikidata"];
            $feature["properties"]["etymologies"] = [];
            if (preg_match("/^Q[0-9]+(;Q[0-9]+)*$/", $wikidataTag)) {
                foreach (explode(";", $wikidataTag) as $etymologyID) {
                    $feature["properties"]["etymologies"][] = ["id" => $etymologyID];
                }
            } else {
                error_log("Feature does not contain a valid list of wikidata tags");
            }
            //}

            if ($element["type"] == "node") {
                // ======================================== NODES start ========================================
                if (empty($element["lon"]) || empty($element["lat"])) {
                    error_log("OverpassEtymologyQueryResult: $elementID has no coordinates");
                } else {
                    $feature["geometry"]["type"] = "Point";
                    // https://docs.mapbox.com/help/troubleshooting/working-with-large-geojson-data/
                    $feature["geometry"]["coordinates"] = [
                        round($element["lon"], 5),
                        round($element["lat"], 5),
                    ];
                }
                // ======================================== NODES end ========================================
            } elseif ($element["type"] == "way") {
                // ======================================== WAYS start ========================================
                if (empty($element["nodes"]) || !is_array($element["nodes"])) {
                    error_log("OverpassEtymologyQueryResult: $elementID has no nodes");
                } else {
                    $totalNodes = count($element["nodes"]);
                    $coordinates = [];

                    /**
                     * @psalm-suppress MixedAssignment
                     */
                    foreach ($element["nodes"] as $node) {
                        if (!is_int($node)) {
                            error_log("OverpassEtymologyQueryResult: way " . (int)$element["id"] . " has a node that is not an integer");
                        } else {
                            for ($i = count($allElements) - 1; $i >= 0; $i--) {
                                assert(!empty($allElements[$i]) && is_array($allElements[$i]));
                                if ($allElements[$i]["id"] == $node) {
                                    $coordinates[] = [
                                        round($allElements[$i]["lon"], 5),
                                        round($allElements[$i]["lat"], 5),
                                    ];
                                }
                            }
                        }
                    }

                    $firstNode = (int)$element["nodes"][0];
                    $lastNode = (int)$element["nodes"][$totalNodes - 1];
                    $isRoundabout = !empty($element["tags"]["junction"]) && $element["tags"]["junction"] == "roundabout";
                    $isForcedNotArea = !empty($element["tags"]["area"]) && $element["tags"]["area"] == "no";
                    $isArea = $firstNode == $lastNode && !$isRoundabout && !$isForcedNotArea;
                    if ($isArea) {
                        $feature["geometry"]["type"] = "Polygon";
                        $feature["geometry"]["coordinates"][] = $coordinates;
                    } else {
                        $feature["geometry"]["type"] = "LineString";
                        $feature["geometry"]["coordinates"] = $coordinates;
                    }
                }
                // ======================================== NODES end ========================================
            } else {
                // ======================================== RELATIONS start ========================================
                //! Relations not yet supported
                //TODO
                error_log("OverpassEtymologyQueryResult: skipped $elementID");
                $feature = false;
                //$feature["geometry"]["type"] = "MultiPolygon";
                // ======================================== NODES end ========================================
            }
        }

        return $feature;
    }
}