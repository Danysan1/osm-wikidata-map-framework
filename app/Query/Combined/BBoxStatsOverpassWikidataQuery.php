<?php

declare(strict_types=1);

namespace App\Query\Combined;

use App\Query\BBoxGeoJSONQuery;
use \App\Query\Combined\BBoxJSONOverpassWikidataQuery;
use App\Query\StringSetXMLQueryFactory;
use \App\Query\Wikidata\GeoJSON2JSONStatsWikidataQuery;
use \App\Result\JSONLocalQueryResult;
use \App\Result\JSONQueryResult;
use App\ServerTiming;

/**
 * Combined query to Overpass and Wikidata.
 * It expects a bounding box and a language.
 * Fetches the objects in the given bounding box and the stats in the given language.
 */
class BBoxStatsOverpassWikidataQuery extends BBoxJSONOverpassWikidataQuery
{
    private ?string $colorCsvFileName;

    public function __construct(BBoxGeoJSONQuery $baseQuery, StringSetXMLQueryFactory $wikidataFactory, ServerTiming $timing, ?string $colorCsvFileName = null)
    {
        parent::__construct($baseQuery, $wikidataFactory, $timing);
        $this->colorCsvFileName = $colorCsvFileName;
    }

    protected function createResult(array $overpassGeoJSONData): JSONQueryResult
    {
        if (!isset($overpassGeoJSONData["features"])) {
            throw new \Exception("Invalid GeoJSON data (no features array)");
        } elseif (empty($overpassGeoJSONData["features"])) {
            $out = new JSONLocalQueryResult(true, []);
        } else {
            $wikidataQuery = new GeoJSON2JSONStatsWikidataQuery($overpassGeoJSONData, $this->wikidataFactory);
            $out = $wikidataQuery->sendAndGetJSONResult();

            if (!empty($this->colorCsvFileName)) {
                $jsonData = $out->getJSONData();
                $csvFilePath = __DIR__ . "/../../csv/" . $this->colorCsvFileName;
                $csvFile = @fopen($csvFilePath, "r");
                if ($csvFile === false) {
                    error_log("Failed opening Wikidata CSV file - $csvFilePath");
                } else {
                    for ($i = 0; $i < count($jsonData); $i++) {
                        $foundColorForRow = false;
                        for ($row = fgetcsv($csvFile); $row && !$foundColorForRow; $row = fgetcsv($csvFile)) {
                            $wikidataQID = (string)($row[0]);
                            $color = (string)($row[3]);
                            if ($jsonData[$i]["id"] == $wikidataQID) {
                                $jsonData[$i]["color"] = $color;
                                $foundColorForRow = true;
                            }
                        }
                        fseek($csvFile, 0);
                        if (!$foundColorForRow)
                            $jsonData[$i]["color"] = "#223b53";
                    }
                }
                $out = new JSONLocalQueryResult(true, $jsonData);
            }
        }

        return $out;
    }
}
