<?php
require_once(__DIR__ . "/OverpassQueryResult.php");

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
class OverpassCenterQueryResult extends OverpassQueryResult
{
    /**
     * @param int $index
     * @param array $element
     * @param array $allElements
     * @return array|false
     */
    protected function convertElementToGeoJSONFeature($index, $element, $allElements)
    {
        $elementID = (string)$element["type"] . "/" . (int)$element["id"];
        $feature = [
            "type" => "Feature",
            "geometry" => [],
            "properties" => ["@id" => $elementID],
        ];

        if (empty($element["center"]["lon"]) || empty($element["center"]["lat"])) {
            error_log("OverpassQueryResult::getGeoJSONData: $elementID has no coordinates");
            $feature = false;
        } else {
            $feature["geometry"]["type"] = "Point";
            // https://docs.mapbox.com/help/troubleshooting/working-with-large-geojson-data/
            $feature["geometry"]["coordinates"] = [
                round($element["center"]["lon"], 5),
                round($element["center"]["lat"], 5),
            ];
        }

        return $feature;
    }
}
