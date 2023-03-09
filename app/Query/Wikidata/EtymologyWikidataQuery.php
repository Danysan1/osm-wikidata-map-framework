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
    private BoundingBox $bbox;
    private JSONQuery $baseQuery;
    private ?string $language;

    public function __construct(BoundingBox $bbox, JSONQuery $baseQuery, ?string $language = null)
    {
        $this->bbox = $bbox;
        $this->baseQuery = $baseQuery;
        $this->language = $language;
    }

    public function getBBox(): BoundingBox
    {
        return $this->bbox;
    }

    public function getQuery(): string
    {
        return $this->baseQuery->getQuery();
    }

    protected function getBaseQuery(): JSONQuery
    {
        return $this->baseQuery;
    }

    private function convertWikidataUriToGeoJsonEtymology(string $wikidataURI): array
    {
        if (empty($wikidataURI))
            throw new Exception("Bad wikidata etymology result");
        $etymologyQID = str_replace("http://www.wikidata.org/entity/", "", $wikidataURI);
        return [
            OverpassEtymologyQueryResult::ETYMOLOGY_WD_ID_KEY => $etymologyQID,
            "from_wikidata" => true,
        ];
    }

    private function convertRowToGeoJsonRow(mixed $row): array
    {
        if (!is_array($row) || empty($row["location"]["value"]) || empty($row["etymology"]["value"]))
            throw new Exception("Bad wikidata result row");
        $matches = [];
        if (!preg_match('/^Point\(([-\d.]+) ([-\d.]+)\)$/', (string)$row["location"]["value"], $matches))
            throw new Exception("Bad location result from Wikidata");
        $lon = (float)$matches[1];
        $lat = (float)$matches[2];
        $wikidata = empty($row["item"]["value"]) ? null : str_replace("http://www.wikidata.org/entity/", "", (string)$row["item"]["value"]);
        $name = empty($row["itemLabel"]["value"]) ? null : (string)$row["itemLabel"]["value"];
        $commons = empty($row["commons"]["value"]) ? null : str_replace("http://commons.wikimedia.org/wiki/", "", (string)$row["commons"]["value"]);
        return [
            "geometry" => [
                "type" => "Point",
                "coordinates" => [round($lon, 5), round($lat, 5)]
            ],
            "properties" => [
                "name" => $name,
                "gender_color" => "#3bb2d0",
                "source_color" => "#3399ff",
                "type_color" => "#3bb2d0",
                OverpassEtymologyQueryResult::FEATURE_WIKIDATA_KEY => $wikidata,
                OverpassEtymologyQueryResult::FEATURE_COMMONS_KEY => $commons,
                "etymologies" => [
                    $this->convertWikidataUriToGeoJsonEtymology((string)$row["etymology"]["value"])
                ]
            ]
        ];
    }

    private function reduceRowToGeoJsonQuery(array $carry, mixed $row): array
    {
        if (!is_array($row) || empty($row["location"]["value"]) || empty($row["etymology"]["value"]))
            throw new Exception("Bad wikidata result row");
        $found = false;
        if (!empty($row["item"]["value"])) {
            $rowWikidata = empty($row["item"]["value"]) ? null : str_replace("http://www.wikidata.org/entity/", "", (string)$row["item"]["value"]);
            for ($i = 0; !$found && $i < count($carry); $i++) {
                $existingWikidata = empty($carry[$i]["properties"][OverpassEtymologyQueryResult::FEATURE_WIKIDATA_KEY]) ? null : (string)$carry[$i]["properties"][OverpassEtymologyQueryResult::FEATURE_WIKIDATA_KEY];
                $sameWikidata = $rowWikidata != null && $existingWikidata != null && $rowWikidata == $existingWikidata;
                //error_log("reduceRowToGeoJsonQuery: $rowWikidata VS $existingWikidata = $sameWikidata");
                if ($sameWikidata) {
                    $found = true;
                    $carry[$i]["properties"]["etymologies"][] = $this->convertWikidataUriToGeoJsonEtymology((string)$row["etymology"]["value"]);
                }
            }
        }
        if (!$found)
            $carry[] = $this->convertRowToGeoJsonRow($row);
        return $carry;
    }

    public function sendAndGetGeoJSONResult(): GeoJSONQueryResult
    {
        $wdResult = $this->baseQuery->sendAndGetJSONResult();
        if (!$wdResult->isSuccessful())
            throw new Exception("Wikidata query failed");
        $rows = $wdResult->getJSONData()["results"]["bindings"];
        if (!is_array($rows))
            throw new Exception("Bad result from Wikidata");
        $ret = new GeoJSONLocalQueryResult(true, [
            "type" => "FeatureCollection",
            //"features" => array_map([$this, "convertRowToGeoJsonRow"], $rows),
            "features" => array_reduce($rows, [$this, "reduceRowToGeoJsonQuery"], []),
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
