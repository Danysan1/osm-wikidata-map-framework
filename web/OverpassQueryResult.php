<?php
require_once("./JSONRemoteQueryResult.php");
require_once("./GeoJSONQueryResult.php");

class OverpassQueryResult extends JSONRemoteQueryResult implements GeoJSONQueryResult {
    /**
     * @return array
     *
     * https://gis.stackexchange.com/questions/115733/converting-json-to-geojson-or-csv/115736#115736
     */
    public function getGeoJSONData() {
        $data = $this->getResult();
        if(!isset($data["elements"]) || !is_array($data["elements"])) {
            throw new Exception("No elements found in Overpass response");
        }
        $totalElements = count($data["elements"]);

        $geojson = ["type"=>"FeatureCollection", "features"=>[]];

        foreach ($data["elements"] as $row) {
            if(!empty($row["tags"]) && !empty($row["tags"]["name:etymology:wikidata"])) {
                $feature = [
                    "type"=>"Feature",
                    "geometry"=>[],
                    "id"=>$row["id"],
                    "properties"=>$row["tags"]
                ];

                if($row["type"]=="node") {
                    $feature["geometry"]["type"] = "Point";
                    $feature["geometry"]["coordinates"] = [$row["lon"], $row["lat"]];
                } elseif ($row["type"]=="way") {
                    assert(!empty($row["nodes"]) && is_array($row["nodes"]));
                    $totalNodes = count($row["nodes"]);
                    $coordinates = [];

                    foreach($row["nodes"] as $node) {
                        for($i=$totalElements-1; $i>=0; $i--) {
                            assert(!empty($data["elements"][$i]) && is_array($data["elements"][$i]));
                            if($data["elements"][$i]["id"]==$node) {
                                $coordinates[] = [$data["elements"][$i]["lon"], $data["elements"][$i]["lat"]];
                            }
                        }
                    }

                    $firstNode = $row["nodes"][0];
                    $lastNode = $row["nodes"][$totalNodes-1];
                    $isRoundabout = !empty($row["tags"]["junction"]) && $row["tags"]["junction"]=="roundabout";
                    $isForcedNotArea = !empty($row["tags"]["area"]) && $row["tags"]["area"]=="no";
                    $isArea = $firstNode==$lastNode && !$isRoundabout && !$isForcedNotArea;
                    if ($isArea) {
                        $feature["geometry"]["type"] = "Polygon";
                        $feature["geometry"]["coordinates"][] = $coordinates;
                    } else {
                        $feature["geometry"]["type"] = "LineString";
                        $feature["geometry"]["coordinates"] = $coordinates;
                    }
                } else {
                    //! Relations not yet supported
                    //$feature["geometry"]["type"] = "MultiPolygon";
                }

                $geojson["features"][] = $feature;
            }
        }

        return $geojson;
    }

    /**
     * @return string
     */
    public function getGeoJSON() {
        return json_encode($this->getGeoJSONData());
    }

    /**
     * @return array
     */
    public function getGroupedByEtymology() {
        $data = $this->getResult();
        $groupedData = [];

        foreach ($data["elements"] as $row) {
            if(!empty($row["attributes"]["name:etymology:wikidata"])) {
                $name = $row["attributes"]["name"];
                $wikidata = $row["attributes"]["name:etymology:wikidata"];

                //TODO
            }
        }

        return $groupedData;
    }
}