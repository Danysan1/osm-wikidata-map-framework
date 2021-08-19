<?php
require_once(__DIR__."/OverpassQueryResult.php");

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
class OverpassCenterQueryResult extends OverpassQueryResult {
    /**
     * @param int $index
     * @param array $element
     * @param array $allElements
     * @return array|false
     */
    protected function convertElementToGeoJSONFeature($index, $element, $allElements)
    {
        $feature = [
            "type" => "Feature",
            "geometry" => [],
        ];
        $feature["properties"]["@id"] = $element["type"]."/".$element["id"];
        
        if(empty($element["center"]["lon"]) || empty($element["center"]["lat"])) {
            error_log("OverpassQueryResult::getGeoJSONData: node ".$element["id"]." has no coordinates");
            $feature = false;
        } else {
            $feature["geometry"]["type"] = "Point";
            $feature["geometry"]["coordinates"] = [$element["center"]["lon"], $element["center"]["lat"]];
        }

        return $feature;
    }
}