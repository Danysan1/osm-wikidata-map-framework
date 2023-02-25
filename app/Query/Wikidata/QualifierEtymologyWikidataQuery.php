<?php

declare(strict_types=1);

namespace App\Query\Wikidata;

use App\BoundingBox;
use App\Query\BaseQuery;
use App\Query\BBoxGeoJSONQuery;
use \App\Query\GeoJSONQuery;
use \App\Query\Wikidata\GeoJSON2JSONEtymologyWikidataQuery;
use \App\Result\Overpass\OverpassEtymologyQueryResult;
use \App\Result\JSONQueryResult;
use \App\Result\GeoJSONQueryResult;
use \App\Result\GeoJSONLocalQueryResult;
use App\Result\QueryResult;
use \App\Result\XMLQueryResult;
use \App\Result\Wikidata\XMLWikidataEtymologyQueryResult;
use App\ServerTiming;
use Exception;

class QualifierEtymologyWikidataQuery extends BaseQuery implements BBoxGeoJSONQuery
{
    private BoundingBox $bbox;
    private JSONWikidataQuery $baseQuery;

    public function __construct(BoundingBox $bbox, string $wikidataProperty, string $endpointURL, ?string $imageProperty = null)
    {
        $southWest = $bbox->getMinLon() . " " . $bbox->getMinLat();
        $northEast = $bbox->getMaxLon() . " " . $bbox->getMaxLat();
        $commonsQuery = "OPTIONAL { ?item wdt:$imageProperty ?commons. }";
        $this->baseQuery = new JSONWikidataQuery(
            "SELECT DISTINCT ?item ?itemLabel ?location ?commons
            WHERE {
              ?item p:$wikidataProperty ?burial.
              SERVICE wikibase:box {
                ?burial pq:P625 ?location.
                bd:serviceParam wikibase:cornerWest 'Point($southWest)'^^geo:wktLiteral .
                bd:serviceParam wikibase:cornerEast 'Point($northEast)'^^geo:wktLiteral .
              } # https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual#Search_within_box
              $commonsQuery
            }",
            $endpointURL
        );
        $this->bbox = $bbox;
    }

    public function getBBox(): BoundingBox
    {
        return $this->bbox;
    }

    public function getQuery(): string
    {
        return $this->baseQuery->getQuery();
    }

    private function convertRowToGeoJSONQuery(mixed $row): array
    {
        if (!is_array($row) || empty($row["location"]["value"]) || empty($row["item"]["value"]))
            throw new Exception("Bad wikidata result row");
        $matches = [];
        if (!preg_match('/^Point\(([-\d.]+) ([-\d.]+)\)$/', (string)$row["location"]["value"], $matches))
            throw new Exception("Bad location result from Wikidata");
        $lon = (float)$matches[1];
        $lat = (float)$matches[2];
        $commons = empty($row["commons"]["value"]) ? null : str_replace("http://commons.wikimedia.org/wiki/", "", (string)$row["commons"]["value"]);
        $itemQID = str_replace("http://www.wikidata.org/entity/", "", (string)$row["item"]["value"]);
        return [
            "geometry" => [
                "type" => "Point",
                "coordinates" => [round($lon, 5), round($lat, 5)]
            ],
            "properties" => [
                "wikimedia_commons" => $commons,
                "etymologies" => [
                    [OverpassEtymologyQueryResult::ETYMOLOGY_WD_ID_KEY => $itemQID]
                ]
            ]
        ];
    }

    public function sendAndGetGeoJSONResult(): GeoJSONQueryResult
    {
        $wdResult = $this->baseQuery->sendAndGetJSONResult();
        if (!$wdResult->isSuccessful())
            throw new Exception("Wikidata query failed");
        $rows = $wdResult->getJSONData()["results"]["bindings"];
        if (!is_array($rows))
            throw new Exception("Bad result from Wikidata");
        return new GeoJSONLocalQueryResult(
            true,
            [
                "type" => "FeatureCollection",
                "features" => array_map([$this, "convertRowToGeoJSONQuery"], $rows)
            ]
        );
    }

    public function send(): QueryResult
    {
        return $this->sendAndGetGeoJSONResult();
    }

    public function sendAndGetJSONResult(): JSONQueryResult
    {
        return $this->sendAndGetGeoJSONResult();
    }
}
