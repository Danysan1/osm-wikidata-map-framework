<?php
require_once("./GeoJSONQuery.php");
require_once("./EtymologyIDListWikidataQuery.php");

class GeoJSONEtymologyWikidataQuery extends EtymologyIDListWikidataQuery {
    /**
     * @var array
     */
    private $geoJSONInputData;

    /**
     * @param array $geoJSONData
     * @param string $language
     */
    public function __construct($geoJSONData, $language) {
        if(empty($geoJSONData["type"]) || $geoJSONData["type"] != "FeatureCollection") {
            throw new Exception("GeoJSON data is not a FeatureCollection");
        }
        if(empty($geoJSONData["features"])) {
            throw new Exception("GeoJSON data does not contain any features");
        }
        $this->geoJSONInputData = $geoJSONData;

        $etymologyIDs = array_map(function($feature) {
            return $feature["properties"]["name:etymology:wikidata"];
        }, $geoJSONData["features"]);

        parent::__construct($etymologyIDs, $language);
    }

    /**
     * @return array
     */
    public function getGeoJSONInputData() {
        return $this->geoJSONInputData;
    }
}