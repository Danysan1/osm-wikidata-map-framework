<?php

declare(strict_types=1);

namespace App\Query\Combined;


use \App\Query\BBoxGeoJSONQuery;
use \App\Query\Combined\BBoxJSONOverpassWikidataQuery;
use App\Query\StringSetXMLQueryFactory;
use \App\Query\Wikidata\GeoJSON2GeoJSONEtymologyWikidataQuery;
use \App\Result\GeoJSONLocalQueryResult;
use \App\Result\QueryResult;
use \App\Result\JSONQueryResult;
use \App\Result\GeoJSONQueryResult;
use App\ServerTiming;

/**
 * Combined query to Overpass and Wikidata.
 * It expects a bounding box and a language.
 * Fetches the objects in the given bounding box and its etymologies in the given language.
 */
class BBoxGeoJSONEtymologyQuery extends BBoxJSONOverpassWikidataQuery implements BBoxGeoJSONQuery
{
    private ?string $genderColorCsvFileName;
    private ?string $typeColorCsvFileName;

    public function __construct(BBoxGeoJSONQuery $baseQuery, StringSetXMLQueryFactory $wikidataFactory, ServerTiming $timing, ?string $genderColorCsvFileName = null, ?string $typeColorCsvFileName = null)
    {
        parent::__construct($baseQuery, $wikidataFactory, $timing);
        $this->genderColorCsvFileName = $genderColorCsvFileName;
        $this->typeColorCsvFileName = $typeColorCsvFileName;
    }

    protected function createResult(array $overpassGeoJSONData): JSONQueryResult
    {
        if (!isset($overpassGeoJSONData["features"])) {
            throw new \Exception("Invalid GeoJSON data (no features array)");
        } elseif (empty($overpassGeoJSONData["features"])) {
            $out = new GeoJSONLocalQueryResult(true, ["type" => "FeatureCollection", "features" => []]);
        } else {
            $wikidataQuery = new GeoJSON2GeoJSONEtymologyWikidataQuery($overpassGeoJSONData, $this->wikidataFactory);
            $out = $wikidataQuery->sendAndGetGeoJSONResult();
            if (!empty($this->genderColorCsvFileName))
                $out = $this->updateResultWithColorsFromCSV($out, "genderID", "gender_color", $this->genderColorCsvFileName);
            if (!empty($this->typeColorCsvFileName))
                $out = $this->updateResultWithColorsFromCSV($out, "instanceID", "type_color", $this->typeColorCsvFileName);
        }
        return $out;
    }

    private function updateResultWithColorsFromCSV(
        GeoJSONQueryResult $jsonResult,
        string $etymologyField,
        string $colorField,
        string $colorCsvFileName
    ): GeoJSONQueryResult {
        $csvFilePath = __DIR__ . "/../../csv/" . $colorCsvFileName;
        $csvFile = @fopen($csvFilePath, "r");
        if ($csvFile === false) {
            error_log("Failed opening Wikidata CSV file - $csvFilePath");
            return $jsonResult;
        }

        $geoJsonData = $jsonResult->getGeoJSONData();
        $featureCount = count($geoJsonData["features"]);
        for ($i = 0; $i < $featureCount; $i++) {
            $foundColorForFeature = false;
            for ($row = fgetcsv($csvFile); $row && !$foundColorForFeature; $row = fgetcsv($csvFile)) {
                $wikidataQID = (string)($row[0]);
                if (!empty($geoJsonData["features"][$i]["properties"]["etymologies"])) {
                    $etymologies = $geoJsonData["features"][$i]["properties"]["etymologies"];
                    $etymologyCount = count($etymologies);
                    for ($j = 0; !$foundColorForFeature && $j < $etymologyCount; $j++) {
                        if ($etymologies[$j][$etymologyField] == $wikidataQID) {
                            $color = (string)($row[3]);
                            $geoJsonData["features"][$i]["properties"][$colorField] = $color;
                            $foundColorForFeature = true;
                        }
                    }
                }
            }
            fseek($csvFile, 0);
            if (!$foundColorForFeature)
                $geoJsonData["features"][$i]["properties"][$colorField] = "#223b53";
        }
        return new GeoJSONLocalQueryResult(true, $geoJsonData);
    }

    public function sendAndGetGeoJSONResult(): GeoJSONQueryResult
    {
        $out = $this->send();
        if (!$out instanceof GeoJSONQueryResult)
            throw new \Exception("sendAndGetGeoJSONResult(): can't get GeoJSON result");
        return $out;
    }
}
