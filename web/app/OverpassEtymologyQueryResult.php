<?php
require_once(__DIR__."/OverpassQueryResult.php");

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
class OverpassEtymologyQueryResult extends OverpassQueryResult {
    /**
     * @param int $index
     * @param array $element
     * @param array $allElements
     * @return array|false
     */
    protected function convertElementToGeoJSONFeature($index, $element, $allElements)
    {
        if(empty($element["tags"]) || !is_array($element["tags"]) || empty($element["tags"]["name:etymology:wikidata"])) {
            $feature = false;
        } else {
            $feature = [
                "type" => "Feature",
                "geometry" => [],
                "properties" => $element["tags"]
            ];
            $feature["properties"]["@id"] = (string)$element["type"]."/".(int)$element["id"];

            //if(!empty($element["tags"]["name:etymology:wikidata"])) {
            $wikidataTag = (string)$feature["properties"]["name:etymology:wikidata"];
            $feature["properties"]["etymologies"] = [];
            if (preg_match("/^Q[0-9]+(;Q[0-9]+)*$/", $wikidataTag)) {
                foreach(explode(";", $wikidataTag) as $etymologyID) {
                    $feature["properties"]["etymologies"][] = ["id"=>$etymologyID];
                }
            } else {
                error_log("Feature does not contain a valid list of wikidata tags");
            }
            //}

            if($element["type"]=="node") {
                // ======================================== NODES start ========================================
                if(empty($element["lon"]) || empty($element["lat"])) {
                    error_log("OverpassEtymologyQueryResult: node ".(int)$element["id"]." has no coordinates");
                } else {
                    $feature["geometry"]["type"] = "Point";
                    $feature["geometry"]["coordinates"] = [$element["lon"], $element["lat"]];
                }
                // ======================================== NODES end ========================================
            } elseif ($element["type"]=="way") {
                // ======================================== WAYS start ========================================
                if(empty($element["nodes"]) || !is_array($element["nodes"])) {
                    error_log("OverpassEtymologyQueryResult: way ".(int)$element["id"]." has no nodes");
                } else {
                    $totalNodes = count($element["nodes"]);
                    $coordinates = [];
                    
                    /**
                     * @psalm-suppress MixedAssignment
                     */
                    foreach($element["nodes"] as $node) {
                        if(!is_int($node)) {
                            error_log("OverpassEtymologyQueryResult: way ".(int)$element["id"]." has a node that is not an integer");
                        } else {
                            for($i=count($allElements)-1; $i>=0; $i--) {
                                assert(!empty($allElements[$i]) && is_array($allElements[$i]));
                                if($allElements[$i]["id"]==$node) {
                                    $coordinates[] = [$allElements[$i]["lon"], $allElements[$i]["lat"]];
                                }
                            }
                        }
                    }

                    $firstNode = (int)$element["nodes"][0];
                    $lastNode = (int)$element["nodes"][$totalNodes-1];
                    $isRoundabout = !empty($element["tags"]["junction"]) && $element["tags"]["junction"]=="roundabout";
                    $isForcedNotArea = !empty($element["tags"]["area"]) && $element["tags"]["area"]=="no";
                    $isArea = $firstNode==$lastNode && !$isRoundabout && !$isForcedNotArea;
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
                error_log("OverpassEtymologyQueryResult: ".(string)$element["type"]." ".(int)$element["id"]." skipped");
                $feature = false;
                //$feature["geometry"]["type"] = "MultiPolygon";
                // ======================================== NODES end ========================================
            }
        }

        return $feature;
    }
}