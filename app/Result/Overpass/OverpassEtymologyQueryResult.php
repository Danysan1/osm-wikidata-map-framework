<?php

declare(strict_types=1);

namespace App\Result\Overpass;


use \App\Result\Overpass\GeoJSONOverpassQueryResult;

/**
 * Result of an Overpass query which can return multiple types of objects and etymology IDs must be separated.
 */
class OverpassEtymologyQueryResult extends GeoJSONOverpassQueryResult
{
    /**
     * @var array<string,string> $passthroughKeyMapping List of OSM keys to pass through with their respective keys to map to 
     */
    private array $passthroughKeyMapping;
    /**
     * @var array<string> $keys OSM wikidata keys to use
     */
    private array $keys;
    private string $defaultLanguage;
    private ?string $language;

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
        ?string $textKey,
        ?string $descriptionKey,
        array $keys,
        string $defaultLanguage,
        ?string $language = null,
        ?string $overpassQuery = null
    ) {
        parent::__construct($success, $result, $overpassQuery);
        $this->passthroughKeyMapping = [
            "alt_name" => "alt_name",
            "official_name" => "official_name",
            "wikipedia" => "wikipedia",
            "wikimedia_commons" => self::FEATURE_COMMONS_KEY,
        ];
        if (!empty($textKey))
            $this->passthroughKeyMapping[$textKey] = "text_etymology";
        if (!empty($descriptionKey))
            $this->passthroughKeyMapping[$descriptionKey] = "text_etymology_descr";
        $this->keys = $keys;
        $this->defaultLanguage = $defaultLanguage;
        $this->language = $language;
    }

    protected function convertElementToGeoJSONFeature(int $index, array $element, array $allElements): array|false
    {
        if (empty($element["tags"]) || !is_array($element["tags"])) {
            return false;
        }
        $osmType = (string)$element["type"];
        $osmID = (int)$element["id"];
        $osmURL = "https://www.openstreetmap.org/$osmType/$osmID";

        $defaultLanguageNameTag = "name:" . $this->defaultLanguage;
        $languageNameTag = empty($this->language) ? null : "name:" . $this->language;

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

        if ($languageNameTag && !empty($element["tags"][$languageNameTag])) {
            $elementName = (string)$element["tags"][$languageNameTag];
        } else if (!empty($element["tags"]["name"])) {
            $elementName = (string)$element["tags"]["name"];
        } else if (!empty($element["tags"][$defaultLanguageNameTag])) {
            // Usually the name in the main language is in name=*, not in name:<main_language>=*, so using name:<default_launguage>=* before name=* would often hide the name in the main language
            $elementName = (string)$element["tags"][$defaultLanguageNameTag];
        } else {
            $elementName = null;
            //error_log("Abnormal element with etymology but no name: $osmURL");
        }

        $feature = [
            "type" => "Feature",
            "geometry" => [],
            "properties" => [
                "name" => $elementName,
                "from_osm" => true,
                "from_wikidata" => false,
                "osm_type" => $osmType,
                "osm_id" => $osmID,
                "gender_color" => "#3bb2d0",
                "source_color" => "#33ff66",
                "type_color" => "#3bb2d0",
                "country_color" => "#3bb2d0",
            ],
        ];

        foreach ($this->passthroughKeyMapping as $osmKey => $responseKey) {
            if (!empty($element["tags"][$osmKey]))
                $feature["properties"][$responseKey] = (string)$element["tags"][$osmKey];
        }

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
