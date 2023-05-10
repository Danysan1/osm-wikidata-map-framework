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

    public function __construct(BoundingBox $bbox, JSONWikidataQuery $baseQuery, ?string $language = null, ?string $wikidataQuery = null)
    {
        $this->bbox = $bbox;
        $this->baseQuery = $baseQuery;
        $this->language = $language;
    }

    public function getBBox(): BoundingBox
    {
        return $this->bbox;
    }

    protected function getBaseQuery(): JSONQuery
    {
        return $this->baseQuery;
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
        if (!preg_match('/^Point\(([-\d.]+) ([-\d.]+)\)$/', (string)$row["location"]["value"], $matches)) {
            error_log((string)$row["location"]["value"]);
            throw new Exception("Bad location result from Wikidata");
        }
        $lon = round((float)$matches[1], 5);
        $lat = round((float)$matches[2], 5);
        $itemQID = empty($row["item"]["value"]) ? null : str_replace(self::WD_ENTITY_PREFIX, "", (string)$row["item"]["value"]);
        $name = empty($row["itemLabel"]["value"]) ? null : (string)$row["itemLabel"]["value"];
        $commons = empty($row["commons"]["value"]) ? null : "Category:" . (string)$row["commons"]["value"];
        $picture = empty($row["picture"]["value"]) ? null : str_replace("http://commons.wikimedia.org/wiki/", "", (string)$row["picture"]["value"]);
        return [
            "type" => "Feature", // https://www.rfc-editor.org/rfc/rfc7946#section-3.2
            "id" => $itemQID ? $itemQID : $lon . "," . $lat,
            "geometry" => [
                "type" => "Point",
                "coordinates" => [$lon, $lat]
            ],
            "properties" => [
                "name" => $name,
                "gender_color" => "#3bb2d0",
                "source_color" => "#3399ff",
                "type_color" => "#3bb2d0",
                OverpassEtymologyQueryResult::FEATURE_WIKIDATA_KEY => $itemQID,
                OverpassEtymologyQueryResult::FEATURE_COMMONS_KEY => $commons,
                "picture" => $picture,
                "etymologies" => [
                    $this->convertRowToEtymology($row)
                ]
            ]
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
            error_log($this->baseQuery->__toString());
            throw new Exception("Wikidata query failed");
        }
        $rows = $wdResult->getJSONData()["results"]["bindings"];
        if (!is_array($rows))
            throw new Exception("Bad result from Wikidata");
        $ret = new GeoJSONLocalQueryResult(true, [
            "type" => "FeatureCollection",
            "bbox" => $this->getBBox()->asArray(),
            "etymology_count" => count($rows),
            //"features" => array_map([$this, "convertRowToGeoJsonFeature"], $rows),
            "features" => array_reduce($rows, [$this, "reduceRowToGeoJsonFeatures"], []),
            "wikidata_query" => $this->baseQuery->getWikidataQuery(),
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
