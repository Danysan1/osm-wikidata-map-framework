<?php
require_once("./QueryResult.php");

class OverpassResult extends QueryResult {
    /**
     * @return array
     *
     * https://gis.stackexchange.com/questions/115733/converting-json-to-geojson-or-csv/115736#115736
     */
    public function toGeoJSONData() {
        $data = $this->parseJSONBody();
        $totalElements = count($data["elements"]);
        $geojson = ["type"=>"FeatureCollection", "features"=>[]];

        foreach ($data["elements"] as $row) {
            if(!empty($row["tags"]["name:etymology:wikidata"])) {
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
                    $totalNodes = count($row["nodes"]);
                    $firstNode = $row["nodes"][0];
                    $lastNode = $row["nodes"][$totalNodes-1];
                    $coordinates = [];
                    foreach($row["nodes"] as $node) {
                        for($i=$totalElements-1; $i>=0; $i--) {
                            if($data["elements"][$i]["id"]==$node) {
                                $coordinates[] = [$data["elements"][$i]["lon"], $data["elements"][$i]["lat"]];
                            }
                        }
                    }
                    if ($firstNode == $lastNode) {
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

    public function toGeoJSON() {
        return json_encode($this->toGeoJSONData());
    }

    public function getGroupedByEtymology() {
        $data = $this->parseJSONBody();
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