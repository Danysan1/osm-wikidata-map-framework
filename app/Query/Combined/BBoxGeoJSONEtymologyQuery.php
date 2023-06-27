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
    public function __construct(BBoxGeoJSONQuery $baseQuery, StringSetXMLQueryFactory $wikidataFactory, ServerTiming $timing)
    {
        parent::__construct($baseQuery, $wikidataFactory, $timing);
    }

    protected function createResult(GeoJSONQueryResult $overpassResult): JSONQueryResult
    {
        $overpassGeoJSONData = $overpassResult->getGeoJSONData();
        if (!isset($overpassGeoJSONData["features"])) {
            throw new \Exception("Invalid GeoJSON data (no features array)");
        } elseif (empty($overpassGeoJSONData["features"])) {
            error_log("Empty features, returning directly input GeoJSON result");
            $out = $overpassResult;
        } else {
            $wikidataQuery = new GeoJSON2GeoJSONEtymologyWikidataQuery($overpassGeoJSONData, $this->wikidataFactory);
            $wikidataResult = $wikidataQuery->sendAndGetGeoJSONResult();
            try {
                $geoJsonData = $wikidataResult->getGeoJSONData();
                $geoJsonData = $this->updateResultWithColorsFromCSV($geoJsonData, "genderID", "gender_color", "wikidata_genders.csv");
                $geoJsonData = $this->updateResultWithColorsFromCSV($geoJsonData, "instanceID", "type_color", "wikidata_types.csv");
                $geoJsonData = $this->updateResultWithColorsFromCSV($geoJsonData, "countryID", "country_color", "wikidata_countries.csv");
                $geoJsonData = $this->updateResultWithCenturyColors($geoJsonData, ["start_date", "birth_date", "event_date"], "start_century_color");
                $geoJsonData = $this->updateResultWithCenturyColors($geoJsonData, ["end_date", "death_date", "event_date"], "end_century_color");
                $out = new GeoJSONLocalQueryResult(true, $geoJsonData);
            } catch (\Exception $e) {
                error_log("Exception in BBoxGeoJSONEtymologyQuery: " . $e->getMessage());
                $out = $wikidataResult;
            }
        }
        return $out;
    }

    private function updateResultWithCenturyColors(
        array $geoJsonData,
        array $dateFields,
        string $colorField
    ): array {
        $fieldCount = count($dateFields);
        $featureCount = count($geoJsonData["features"]);
        for ($featureIndex = 0; $featureIndex < $featureCount; $featureIndex++) {
            $foundColorForFeature = false;
            if (!empty($geoJsonData["features"][$featureIndex]["properties"]["etymologies"])) {
                $etymologies = (array)$geoJsonData["features"][$featureIndex]["properties"]["etymologies"];
                $etymologyCount = count($etymologies);
                for ($etyIndex = 0; !$foundColorForFeature && $etyIndex < $etymologyCount; $etyIndex++) {
                    for ($fieldIndex = 0; !$foundColorForFeature && $fieldIndex < $fieldCount; $fieldIndex++) {
                        $dateField = $dateFields[$fieldIndex];
                        if (empty($etymologies[$etyIndex][$dateField])) {
                            //error_log("Empty date field '$dateField' for feature $featureIndex");
                        } else {
                            $isoDate = (string)($etymologies[$etyIndex][$dateField]);
                            $matches = [];
                            $matchCount = preg_match("/^(-?\d+)-.+$/", $isoDate, $matches);
                            if ($matchCount !== false && !empty($matches[1])) {
                                $year = (int)$matches[1];
                                $century = (int)ceil($year / 100);
                                $color = self::getCenturyColor($century);
                                $geoJsonData["features"][$featureIndex]["properties"][$colorField] = $color;
                                //error_log("$featureIndex: $isoDate => $year => $century => $color");
                                $foundColorForFeature = true;
                            }
                        }
                    }
                }
            }
            if (!$foundColorForFeature)
                $geoJsonData["features"][$featureIndex]["properties"][$colorField] = "#223b53";
        }
        return $geoJsonData;
    }

    private function updateResultWithColorsFromCSV(
        array $geoJsonData,
        string $etymologyField,
        string $colorField,
        string $colorCsvFileName
    ): array {
        $csvFilePath = __DIR__ . "/../../csv/" . $colorCsvFileName;
        $csvFile = @fopen($csvFilePath, "r");
        if ($csvFile === false) {
            error_log("Failed opening Wikidata CSV file - $csvFilePath");
            return $geoJsonData;
        }

        $featureCount = count($geoJsonData["features"]);
        for ($featureIndex = 0; $featureIndex < $featureCount; $featureIndex++) {
            $foundColorForFeature = false;
            for ($row = fgetcsv($csvFile); $row && !$foundColorForFeature; $row = fgetcsv($csvFile)) {
                $wikidataQID = (string)($row[0]);
                if (!empty($geoJsonData["features"][$featureIndex]["properties"]["etymologies"])) {
                    $etymologies = (array)$geoJsonData["features"][$featureIndex]["properties"]["etymologies"];
                    $etymologyCount = count($etymologies);
                    for ($etyIndex = 0; !$foundColorForFeature && $etyIndex < $etymologyCount; $etyIndex++) {
                        if (empty($etymologies[$etyIndex][$etymologyField])) {
                            //error_log("Empty etymology field '$etymologyField' for feature $featureIndex");
                        } else if ($etymologies[$etyIndex][$etymologyField] == $wikidataQID) {
                            $color = (string)($row[3]);
                            $geoJsonData["features"][$featureIndex]["properties"][$colorField] = $color;
                            $foundColorForFeature = true;
                        }
                    }
                }
            }
            fseek($csvFile, 0);
            if (!$foundColorForFeature)
                $geoJsonData["features"][$featureIndex]["properties"][$colorField] = "#223b53";
        }
        return $geoJsonData;
    }

    public function sendAndGetGeoJSONResult(): GeoJSONQueryResult
    {
        $out = $this->send();
        if (!$out instanceof GeoJSONQueryResult)
            throw new \Exception("sendAndGetGeoJSONResult(): can't get GeoJSON result");
        return $out;
    }
}
