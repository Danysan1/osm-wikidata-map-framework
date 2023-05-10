<?php

declare(strict_types=1);

namespace App\Result\Overpass;


use \App\Result\Overpass\OverpassQueryResult;
use \App\Result\GeoJSONQueryResult;

/**
 * Result of an Overpass query, convertible to GeoJSON data.
 */
abstract class GeoJSONOverpassQueryResult extends OverpassQueryResult implements GeoJSONQueryResult
{
    private ?string $overpassQuery;

    public function __construct(bool $success, ?array $result, ?string $overpassQuery = null)
    {
        parent::__construct($success, $result);
        $this->overpassQuery = $overpassQuery;
    }

    protected abstract function convertElementToGeoJSONFeature(int $index, array $element, array $allElements): array|false;

    /**
     * @see https://gis.stackexchange.com/questions/115733/converting-json-to-geojson-or-csv/115736#115736
     */
    public function getGeoJSONData(): array
    {
        $elements = $this->getElements();

        $geojson = [
            "type" => "FeatureCollection",
            "features" => [],
        ];

        $etymologyCount = null;
        foreach ($elements as $index => $row) {
            if (!is_int($index)) {
                error_log("OverpassQueryResult::getGeoJSONData: malformed array key");
            } else {
                $feature = $this->convertElementToGeoJSONFeature($index, $row, $elements);
                if (!empty($feature)) {
                    $geojson["features"][] = $feature;
                    if (!empty($feature["properties"]["etymologies"]))
                        $etymologyCount = ($etymologyCount ?? 0) + count($feature["properties"]["etymologies"]);
                }
            }
        }
        if (empty($geojson["features"])) { // debug
            error_log(get_class($this) . ": GeoJSON with no features");
            //error_log(get_class($this) . ": " . json_encode($geojson));
            //error_log(get_class($this) . ": " . json_encode(debug_backtrace()));
        }

        if ($etymologyCount !== null)
            $geojson["etymology_count"] = $etymologyCount;

        if (!empty($this->overpassQuery))
            $geojson["overpass_query"] = $this->overpassQuery;

        return $geojson;
    }

    /**
     * @return string
     */
    public function getGeoJSON(): string
    {
        return json_encode($this->getGeoJSONData());
    }
}
