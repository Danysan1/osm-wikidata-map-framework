<?php

declare(strict_types=1);

namespace App\Query\Wikidata;

use App\BoundingBox;
use App\Query\BaseQuery;
use App\Query\BBoxGeoJSONQuery;
use App\Query\JSONQuery;
use \App\Result\Overpass\OverpassEtymologyQueryResult;
use \App\Result\JSONQueryResult;
use \App\Result\GeoJSONQueryResult;
use \App\Result\GeoJSONLocalQueryResult;
use App\Result\QueryResult;
use Exception;

abstract class EtymologyWikidataQuery extends BaseQuery implements BBoxGeoJSONQuery
{
    private const WD_ENTITY_PREFIX = "http://www.wikidata.org/entity/";
    private const WD_PROPERTY_PREFIX = "http://www.wikidata.org/prop/direct/";

    private BoundingBox $bbox;
    private JSONWikidataQuery $baseQuery;
    private ?string $language;

    /**
     * This query expects all rows in the result of the $baseQuery to have the following variables:
     * - item: The URI of the item
     * - itemLabel: The label of the item
     * - location: The WKT Point location of the item
     * - etymology: The URI of the etymology item
     * - from_entity: The URI of the entity from which the etymology originates
     * - from_prop: The URI of the property from which the etymology originates in the above entity
     * - commons: The name of the Wikimedia Commons category of the item (optional)
     * - picture: The name of the Wikimedia Commons picture of the item (optional)
     * - osmNode: The OSM node ID of the item (optional)
     * - osmWay: The OSM way ID of the item (optional)
     * - osmRelation: The OSM relation ID of the item (optional)
     */
    public function __construct(BoundingBox $bbox, JSONWikidataQuery $baseQuery, ?string $language = null)
    {
        $this->bbox = $bbox;
        $this->baseQuery = $baseQuery;
        $this->language = $language;
    }

    protected static function generateItemLabelQuery(?string $defaultLanguage = null, ?string $language = null): string
    {
        if (empty($defaultLanguage) && empty($language)) {
            // Neither the preferred nor the fallback language are given
            // Get a random label
            $clause = "?item rdfs:label ?itemLabel.";
        } elseif (!empty($defaultLanguage) && !empty($language) && $defaultLanguage != $language) {
            // Both the preferred and the fallback language are given
            // Get the label in the preferred language if available, othewise fallback to the fallback language if available, otherwise fallback to a random label
            $clause = "{
                    ?item rdfs:label ?itemLabel.
                    FILTER(LANG(?itemLabel) = '$language')
                } UNION {
                    MINUS {
                        ?item rdfs:label ?otherLabel.
                        FILTER(LANG(?otherLabel) = '$language')
                    }
                    ?item rdfs:label ?itemLabel.
                    FILTER(LANG(?itemLabel) = '$defaultLanguage')
                } UNION {
                    MINUS {
                        ?item rdfs:label ?otherLabel.
                        FILTER(LANG(?otherLabel) = '$language' || LANG(?otherLabel) = '$defaultLanguage')
                    }
                    ?item rdfs:label ?itemLabel.
                }";
        } else {
            // Only the preferred language XOR the fallback language is given
            // Get the label in the given language if available, otherwise fallback to a random label
            $lang = empty($language) ? $defaultLanguage : $language;
            $clause = "{
                    ?item rdfs:label ?itemLabel.
                    FILTER(LANG(?itemLabel) = '$lang')
                } UNION {
                    MINUS {
                        ?item rdfs:label ?otherLabel.
                        FILTER(LANG(?otherLabel) = '$lang')
                    }
                    ?item rdfs:label ?itemLabel.
                }";
        }

        return $clause;
    }

    public function getBBox(): BoundingBox
    {
        return $this->bbox;
    }

    private function convertRowToEtymology(array $row): array
    {
        if (empty($row["etymology"]["value"])) {
            error_log(json_encode($row));
            throw new Exception("Bad wikidata result row");
        }
        $wikidataURI = (string)$row["etymology"]["value"];
        if (empty($wikidataURI))
            throw new Exception("Bad wikidata etymology result");
        $etymologyQID = str_replace(self::WD_ENTITY_PREFIX, "", $wikidataURI);
        $etymology = [
            OverpassEtymologyQueryResult::ETYMOLOGY_WD_ID_KEY => $etymologyQID,
            "from_wikidata" => true,
        ];

        if (!empty($row["from_entity"]["value"]) && !empty($row["from_prop"]["value"])) {
            $fromEntityURI = (string)$row["from_entity"]["value"];
            $fromEntityQID = str_replace(self::WD_ENTITY_PREFIX, "", $fromEntityURI);
            $etymology["from_wikidata_entity"] = $fromEntityQID;

            $fromPropertyURI = (string)$row["from_prop"]["value"];
            $fromPropertyPID = str_replace(self::WD_PROPERTY_PREFIX, "", $fromPropertyURI);
            $etymology["from_wikidata_prop"] = $fromPropertyPID;
        }
        return $etymology;
    }

    private function convertRowToGeoJsonFeature(mixed $row): array
    {
        if (!is_array($row) || empty($row["location"]["value"]) || empty($row["etymology"]["value"])) {
            error_log(json_encode($row));
            throw new Exception("Bad wikidata result row");
        }
        $matches = [];
        if (!preg_match('/^Point\(([-\dE.]+) ([-\dE.]+)\)$/', (string)$row["location"]["value"], $matches)) {
            error_log((string)$row["location"]["value"]);
            throw new Exception("Bad location result from Wikidata");
        }
        $lon = round((float)$matches[1], 5);
        $lat = round((float)$matches[2], 5);
        $itemQID = empty($row["item"]["value"]) ? null : str_replace(self::WD_ENTITY_PREFIX, "", (string)$row["item"]["value"]);
        $name = empty($row["itemLabel"]["value"]) ? null : (string)$row["itemLabel"]["value"];
        $commons = empty($row["commons"]["value"]) ? null : "Category:" . (string)$row["commons"]["value"];
        $picture = empty($row["picture"]["value"]) ? null : str_replace("http://commons.wikimedia.org/wiki/", "", (string)$row["picture"]["value"]);
        $etymology = $this->convertRowToEtymology($row);

        $properties = [
            "name" => $name,
            "from_osm" => false,
            "from_wikidata" => true,
            "from_wikidata_entity" => $itemQID ? $itemQID : $etymology["from_wikidata_entity"],
            "from_wikidata_prop" => $itemQID ? "P625" : $etymology["from_wikidata_prop"],
            OverpassEtymologyQueryResult::FEATURE_WIKIDATA_KEY => $itemQID,
            OverpassEtymologyQueryResult::FEATURE_COMMONS_KEY => $commons,
            "picture" => $picture,
            "etymologies" => [$etymology]
        ];

        if (!empty($row["osmRelation"]["value"])) {
            $properties["osm_type"] = "relation";
            $properties["osm_id"] = (int)$row["osmRelation"]["value"];
        } else if (!empty($row["osmWay"]["value"])) {
            $properties["osm_type"] = "way";
            $properties["osm_id"] = (int)$row["osmWay"]["value"];
        } else if (!empty($row["osmNode"]["value"])) {
            $properties["osm_type"] = "node";
            $properties["osm_id"] = (int)$row["osmNode"]["value"];
        }

        return [
            "type" => "Feature", // https://www.rfc-editor.org/rfc/rfc7946#section-3.2
            "id" => $itemQID ? $itemQID : $lon . "," . $lat,
            "geometry" => [
                "type" => "Point",
                "coordinates" => [$lon, $lat]
            ],
            "properties" => $properties
        ];
    }

    private function reduceRowToGeoJsonFeatures(array $carry, mixed $row): array
    {
        if (!is_array($row) || empty($row["location"]["value"]) || empty($row["etymology"]["value"])) {
            error_log(json_encode($row));
            throw new Exception("Bad wikidata result row");
        }
        $found = false;
        $newFeature = $this->convertRowToGeoJsonFeature($row);
        for ($i = 0; !$found && $i < count($carry); $i++) {
            if ($carry[$i]["id"] === $newFeature["id"]) {
                $found = true;
                $carry[$i]["properties"]["etymologies"][] = $newFeature["properties"]["etymologies"][0];
            }
        }
        if (!$found)
            $carry[] = $newFeature;
        return $carry;
    }

    public function sendAndGetGeoJSONResult(): GeoJSONQueryResult
    {
        $wdResult = $this->baseQuery->sendAndGetJSONResult();
        if (!$wdResult->isSuccessful()) {
            error_log("Wikidata query failed: " . $this->baseQuery->__toString());
            error_log($this->baseQuery->getWikidataQuery());
            throw new Exception("Wikidata query failed");
        }
        $rows = $wdResult->getJSONData()["results"]["bindings"];
        if (!is_array($rows))
            throw new Exception("Bad result from Wikidata");
        $features = array_reduce($rows, [$this, "reduceRowToGeoJsonFeatures"], []);
        #file_put_contents("EtymologyWikidataQuery.json", json_encode($features));

        $ret = new GeoJSONLocalQueryResult(true, [
            "type" => "FeatureCollection",
            "bbox" => $this->getBBox()->asArray(),
            //"features" => array_map([$this, "convertRowToGeoJsonFeature"], $rows),
            "features" => $features,
            "etymology_count" => count($rows),
            "wikidata_query" => $this->baseQuery->getWikidataQuery()
        ]);

        //error_log("EtymologyWikidataQuery result: $ret");
        return $ret;
    }

    public function send(): QueryResult
    {
        return $this->sendAndGetGeoJSONResult();
    }

    public function sendAndGetJSONResult(): JSONQueryResult
    {
        return $this->sendAndGetGeoJSONResult();
    }

    public function getQueryTypeCode(): string
    {
        $base = parent::getQueryTypeCode();
        return empty($this->language) ? $base : $this->language . "_" . $base;
    }
}
