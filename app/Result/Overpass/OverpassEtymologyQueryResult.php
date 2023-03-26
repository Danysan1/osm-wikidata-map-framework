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
    private string $textTag;
    private string $descriptionTag;
    private array $keys;

    public const FEATURE_WIKIDATA_KEY = "wikidata";
    public const FEATURE_COMMONS_KEY = "commons";
    public const ETYMOLOGY_WD_ID_KEY = "wikidata";

    private const BAD_CHARS = [" ", "\n", "\r", "\t", "\v", "\x00"];

    /**
     * @param array<string> $keys OSM wikidata keys to use
     */
    public function __construct(
        bool $success,
        ?array $result,
        string $textTag,
        string $descriptionTag,
        array $keys
    ) {
        parent::__construct($success, $result);
        $this->textTag = $textTag;
        $this->descriptionTag = $descriptionTag;
        $this->keys = $keys;
    }

    protected function convertElementToGeoJSONFeature(int $index, array $element, array $allElements): array|false
    {
        if (empty($element["tags"]) || !is_array($element["tags"])) {
            return false;
        }
        $osmType = (string)$element["type"];
        $osmID = (int)$element["id"];
        $osmURL = "https://www.openstreetmap.org/$osmType/$osmID";

        /**
         * @var string[] $wikidataEtymologyIDs All avaliable Wikidata etymology IDs
         */
        $wikidataEtymologyIDs = [];
        foreach ($this->keys as $key) {
            if (!empty($element["tags"][$key])) {
                $IDs = explode(";", (string)$element["tags"][$key]);
                foreach ($IDs as $id) {
                    $cleanID = str_replace(self::BAD_CHARS, '', $id);
                    if (preg_match("/^Q\d+$/", $cleanID))
                        $wikidataEtymologyIDs[] = $cleanID;
                    else
                        error_log("'$cleanID' is not a valid wikidata id (found in '$osmURL')");
                }
            }
        }

        if (empty($wikidataEtymologyIDs)) {
            error_log("Feature does not contain any valid etymology wikidata id: $osmURL");
            return false;
        }

        if (empty($element["tags"]["name"])) {
            $elementName = null;
            error_log("Abnormal element with etymology but no name: $osmURL");
        } else {
            $elementName = (string)$element["tags"]["name"];
        }

        $feature = [
            "type" => "Feature",
            "geometry" => [],
            "properties" => [
                "name" => $elementName,
                "osm_type" => $osmType,
                "osm_id" => $osmID,
                "gender_color" => "#3bb2d0",
                "source_color" => "#33ff66",
                "type_color" => "#3bb2d0",
            ],
        ];

        if (!empty($element["tags"]["alt_name"]))
            $feature["properties"]["alt_name"] = (string)$element["tags"]["alt_name"];

        if (!empty($element["tags"][$this->textTag]))
            $feature["properties"]["text_etymology"] = (string)$element["tags"][$this->textTag];

        if (!empty($element["tags"][$this->descriptionTag]))
            $feature["properties"]["text_etymology_descr"] = (string)$element["tags"][$this->descriptionTag];

        if (!empty($element["tags"]["wikipedia"]))
            $feature["properties"]["wikipedia"] = (string)$element["tags"]["wikipedia"];

        if (!empty($element["tags"]["wikimedia_commons"]))
            $feature["properties"][self::FEATURE_COMMONS_KEY] = (string)$element["tags"]["wikimedia_commons"];

        if (!empty($element["tags"]["wikidata"])) {
            $wikidataTag = (string)$element["tags"]["wikidata"];
            $matches = [];
            if (preg_match('/^(Q\d+)/', $wikidataTag, $matches) !== 1)
                error_log("Bad wikidata tag: $wikidataTag");
            else
                $feature["properties"][self::FEATURE_WIKIDATA_KEY] = $matches[1];
        }

        $feature["properties"]["etymologies"] = [];
        foreach ($wikidataEtymologyIDs as $etymologyEtymologyID) {
            $feature["properties"]["etymologies"][] = [
                self::ETYMOLOGY_WD_ID_KEY => $etymologyEtymologyID,
                "from_osm" => true,
                "from_osm_type" => $osmType,
                "from_osm_id" => $osmID,
            ];
        }

        if ($osmType == "node") {
            // ======================================== NODES start ========================================
            if (empty($element["lon"]) || empty($element["lat"])) {
                error_log("OverpassEtymologyQueryResult::convertElementToGeoJSONFeature: $osmURL has no coordinates");
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
                error_log("OverpassEtymologyQueryResult: $osmURL has no nodes");
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
            error_log("OverpassEtymologyQueryResult: skipped $osmURL");
            $feature = false;
            //$feature["geometry"]["type"] = "MultiPolygon";
            // ======================================== RELATIONS end ========================================
        }
        return $feature;
    }
}
