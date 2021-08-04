<?php
require_once("./GeoJSONQuery.php");
require_once("./EtymologyIDListWikidataQuery.php");

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
            $wikidataTag = $feature["properties"]["name:etymology:wikidata"];
            if (!preg_match("/^Q[0-9]+(;Q[0-9]+)*$/", $wikidataTag)) {
                throw new Exception("Feature does not contain a valid list of wikidata tags");
            }
            foreach(explode(";", $wikidataTag) as $etymologyID) {
                $etymologyIDs[] = $etymologyID;
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