<?php
require_once(__DIR__."/GeoJSONQuery.php");
require_once(__DIR__."/EtymologyIDListWikidataQuery.php");

class GeoJSONInputEtymologyWikidataQuery extends EtymologyIDListWikidataQuery {
    /**
     * @var array
     */
    private $geoJSONInputData;

    /**
     * @param array $geoJSONData
     * @param string $language
     */
    public function __construct($geoJSONData, $language, $endpointURL) {
        if(empty($geoJSONData["type"]) || $geoJSONData["type"] != "FeatureCollection") {
            throw new Exception("GeoJSON data is not a FeatureCollection");
        }
        if(empty($geoJSONData["features"])) {
            throw new Exception("GeoJSON data does not contain any features");
        }
        $this->geoJSONInputData = $geoJSONData;

        $etymologyIDs = [];
        foreach($geoJSONData["features"] as $feature) {
            foreach($feature["properties"]["etymologies"] as $etymology) {
                $etymologyIDs[] = $etymology["id"];
            }
        }

        parent::__construct($etymologyIDs, $language, $endpointURL);
    }

    /**
     * @return array
     */
    public function getGeoJSONInputData() {
        return $this->geoJSONInputData;
    }
}