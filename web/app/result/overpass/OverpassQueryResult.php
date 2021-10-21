<?php

namespace App\Result\Overpass;

require_once(__DIR__ . "/../LocalQueryResult.php");
require_once(__DIR__ . "/../GeoJSONQueryResult.php");

use \App\Result\LocalQueryResult;
use \App\Result\GeoJSONQueryResult;
use Exception;
use InvalidArgumentException;

/**
 * Result of an Overpass query, convertible to GeoJSON data.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
abstract class OverpassQueryResult extends LocalQueryResult implements GeoJSONQueryResult
{
    /**
     * @param bool $success
     * @param array|null $result
     */
    public function __construct($success, $result)
    {
        if ($success && !is_array($result)) {
            error_log("OverpassQueryResult::__construct: " . json_encode($result));
            throw new InvalidArgumentException("Overpass query result must be an array");
        }
        parent::__construct($success, $result);
    }

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
        if (!is_array($data)) {
            throw new Exception("Overpass query result is not an array");
        }
        if (!isset($data["elements"])) {
            error_log("OverpassQueryResult: " . json_encode($data));
            throw new \Exception("Missing element section in Overpass response");
        }
        if (!is_array($data["elements"])) {
            error_log("OverpassQueryResult: " . json_encode($data));
            throw new \Exception("Element section in Overpass response is not an array");
        }
        if (empty($data["elements"])) {
            error_log("OverpassQueryResult: No elements found in Overpass response");
        }
        //$totalElements = count($data["elements"]);

        $geojson = ["type" => "FeatureCollection", "features" => []];

        /**
         * @psalm-suppress MixedAssignment
         */
        foreach ($data["elements"] as $index => $row) {
            if (!is_int($index)) {
                error_log("OverpassQueryResult::getGeoJSONData: malformed array key");
            } elseif (!is_array($row)) {
                error_log("OverpassQueryResult::getGeoJSONData: malformed array value");
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
