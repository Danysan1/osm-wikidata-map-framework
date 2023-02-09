<?php

namespace App\Result\Overpass;

require_once(__DIR__ . "/GeoJSONOverpassQueryResult.php");

use \App\Result\Overpass\GeoJSONOverpassQueryResult;

/**
 * Result of an Overpass query which gathers only ids and centroids.
 * 
 * @see BBoxEtymologyCenterOverpassQuery
 */
class OverpassCenterQueryResult extends GeoJSONOverpassQueryResult
{
    protected function convertElementToGeoJSONFeature(int $index, array $element, array $allElements): array|false
    {
        $feature = [
            "type" => "Feature",
            "geometry" => [],
            "properties" => ["osm_type" => $element["type"], "osm_id" => $element["id"]],
        ];

        if (!empty($element["center"]["lon"]) && !empty($element["center"]["lat"])) {
            $feature["geometry"]["type"] = "Point";
            // https://docs.mapbox.com/help/troubleshooting/working-with-large-geojson-data/
            $feature["geometry"]["coordinates"] = [
                round((float)$element["center"]["lon"], 5),
                round((float)$element["center"]["lat"], 5),
            ];
        } elseif (!empty($element["lon"]) && !empty($element["lat"])) {
            $feature["geometry"]["type"] = "Point";
            $feature["geometry"]["coordinates"] = [
                round((float)$element["lon"], 5),
                round((float)$element["lat"], 5),
            ];
        } else {
            error_log("OverpassCenterQueryResult::convertElementToGeoJSONFeature: " . (string)$element["type"] . '/' . (int)$element["id"] . " has no coordinates");
            $feature = false;
        }

        return $feature;
    }
}
