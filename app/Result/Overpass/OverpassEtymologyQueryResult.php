<?php

declare(strict_types=1);

namespace App\Result\Overpass;


use \App\Query\Overpass\OverpassQuery;
use \App\Result\Overpass\GeoJSONOverpassQueryResult;

/**
 * Result of an Overpass query which can return multiple types of objects and etymology IDs must be separated.
 */
class OverpassEtymologyQueryResult extends GeoJSONOverpassQueryResult
{
    private const BAD_CHARS = [" ", "\n", "\r", "\t", "\v", "\x00"];

    protected function convertElementToGeoJSONFeature(int $index, array $element, array $allElements): array|false
    {
        if (empty($element["tags"]) || !is_array($element["tags"])) {
            return false;
        }
        $osmType = (string)$element["type"];
        $osmID = (int)$element["id"];

        $wikidataIdStrings = [];
        foreach (OverpassQuery::ALL_WIKIDATA_ETYMOLOGY_TAGS as $tag) {
            if (!empty($element["tags"][$tag])) {
                $cleanValue = str_replace(self::BAD_CHARS, '', (string)$element["tags"][$tag]);
                if (preg_match("/^Q[0-9]+(;Q[0-9]+)*$/", $cleanValue))
                    $wikidataIdStrings[] = $cleanValue;
                else
                    error_log("'$tag' does not contain a valid list of wikidata tags in 'https://www.openstreetmap.org/$osmType/$osmID'");
            }
        }

        if (empty($wikidataIdStrings)) {
            error_log("Feature does not contain any valid list of wikidata tags: https://www.openstreetmap.org/$osmType/$osmID");
            return false;
        } else {
            $wikidataTag = implode(";", $wikidataIdStrings);
        }

        if (empty($element["tags"]["name"])) {
            $elementName = null;
            error_log("Abnormal element with etymology but no name: https://www.openstreetmap.org/$osmType/$osmID");
        } else {
            $elementName = (string)$element["tags"]["name"];
        }

        $feature = [
            "type" => "Feature",
            "geometry" => [],
            "properties" => [
                "alt_name" => empty($element["tags"]["alt_name"]) ? null : (string)$element["tags"]["alt_name"],
                "commons" => empty($element["tags"]["wikimedia_commons"]) ? null : (string)$element["tags"]["wikimedia_commons"],
                "name" => $elementName,
                "osm_type" => $osmType,
                "osm_id" => $osmID,
                "source_color" => "#33ff66",
                "text_etymology" => empty($element["tags"]["name:etymology"]) ? null : (string)$element["tags"]["name:etymology"],
                "text_etymology_descr" => empty($element["tags"]["name:etymology:description"]) ? null : (string)$element["tags"]["name:etymology:description"],
                "wikipedia" => empty($element["tags"]["wikipedia"]) ? null : (string)$element["tags"]["wikipedia"],
            ],
        ];

        if (!empty($element["tags"]["wikidata"])) {
            $wikidataTag = (string)$element["tags"]["wikidata"];
            $matches = [];
            if (preg_match('/^(Q\d+)/', $wikidataTag, $matches) !== 1)
                error_log("Bad wikidata tag: $wikidataTag");
            else
                $feature["properties"]["wikidata"] = $matches[1];
        }

        $feature["properties"]["etymologies"] = [];
        foreach (explode(";", $wikidataTag) as $etymologyID) {
            $feature["properties"]["etymologies"][] = ["id" => $etymologyID];
        }

        if ($osmType == "node") {
            // ======================================== NODES start ========================================
            if (empty($element["lon"]) || empty($element["lat"])) {
                error_log("OverpassEtymologyQueryResult::convertElementToGeoJSONFeature: https://www.openstreetmap.org/node/$osmID has no coordinates");
            } else {
                $feature["geometry"]["type"] = "Point";
                // https://docs.mapbox.com/help/troubleshooting/working-with-large-geojson-data/
                $feature["geometry"]["coordinates"] = [
                    round((float)$element["lon"], 5),
                    round((float)$element["lat"], 5),
                ];
            }
            // ======================================== NODES end ========================================
        } elseif ($osmType == "way") {
            // ======================================== WAYS start ========================================
            if (empty($element["nodes"]) || !is_array($element["nodes"])) {
                error_log("OverpassEtymologyQueryResult: https://www.openstreetmap.org/way/$osmID has no nodes");
            } else {
                $totalNodes = count($element["nodes"]);
                $coordinates = [];

                /**
                 * @psalm-suppress MixedAssignment
                 */
                foreach ($element["nodes"] as $node) {
                    if (!is_int($node)) {
                        error_log("OverpassEtymologyQueryResult: way $osmID has a node that is not an integer");
                    } else {
                        for ($i = count($allElements) - 1; $i >= 0; $i--) {
                            assert(!empty($allElements[$i]) && is_array($allElements[$i]));
                            if ($allElements[$i]["id"] == $node) {
                                $coordinates[] = [
                                    round((float)$allElements[$i]["lon"], 5),
                                    round((float)$allElements[$i]["lat"], 5),
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
            // ======================================== WAYS end ========================================
        } else {
            // ======================================== RELATIONS start ========================================
            //! Relations not yet supported
            //TODO
            error_log("OverpassEtymologyQueryResult: skipped https://www.openstreetmap.org/relation/$osmID");
            $feature = false;
            //$feature["geometry"]["type"] = "MultiPolygon";
            // ======================================== RELATIONS end ========================================
        }
        return $feature;
    }
}
