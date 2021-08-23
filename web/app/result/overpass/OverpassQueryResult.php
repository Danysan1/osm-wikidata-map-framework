<?php

namespace App\Result\Overpass;

require_once(__DIR__ . "/../LocalQueryResult.php");
require_once(__DIR__ . "/../GeoJSONQueryResult.php");

use \App\Result\LocalQueryResult;
use \App\Result\GeoJSONQueryResult;

/**
 * Result of an Overpass query, convertible to GeoJSON data.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
abstract class OverpassQueryResult extends LocalQueryResult implements GeoJSONQueryResult
{
    /**
     * @param int $index
     * @param array $element
     * @param array $allElements
     * @return array|false
     */
    protected abstract function convertElementToGeoJSONFeature($index, $element, $allElements);

    /**
     * @return array{type:string}
     *
     * https://gis.stackexchange.com/questions/115733/converting-json-to-geojson-or-csv/115736#115736
     */
    public function getGeoJSONData(): array
    {
        $data = $this->getResult();
        if (!isset($data["elements"]) || !is_array($data["elements"])) {
            throw new \Exception("No elements found in Overpass response");
        }
        $totalElements = count($data["elements"]);

        $geojson = ["type" => "FeatureCollection", "features" => []];

        /**
         * @psalm-suppress MixedAssignment
         */
        foreach ($data["elements"] as $index => $row) {
            if (!is_int($index) || !is_array($row)) {
                error_log("OverpassQueryResult::getGeoJSONData: malformed array element");
            } else {
                $feature = $this->convertElementToGeoJSONFeature($index, $row, $data["elements"]);
                if (!empty($feature)) {
                    $geojson["features"][] = $feature;
                }
            }
        }

        return $geojson;
    }

    public function getArray(): array
    {
        return $this->getResult();
    }

    /**
     * @return string
     */
    public function getGeoJSON(): string
    {
        return json_encode($this->getGeoJSONData());
    }
}
