<?php
require_once(__DIR__."/BBoxGeoJSONQuery.php");
require_once(__DIR__."/BBoxEtymologyOverpassQuery.php");
require_once(__DIR__."/GeoJSONEtymologyWikidataQuery.php");

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
class BBoxEtymologyOverpassWikidataQuery extends BBoxEtymologyOverpassQuery implements BBoxGeoJSONQuery {
    /** @var BBoxEtymologyOverpassQuery $overpassQuery */
    //private $overpassQuery;
    
    /** @var string $language */
    private $language;
    
    /** @var string $wikidataEndpointURL */
    private $wikidataEndpointURL;

    /**
     * @param float $minLat
     * @param float $minLon
     * @param float $maxLat
     * @param float $maxLon
     * @param string $overpassEndpointURL
     * @param string $wikidataEndpointURL
     * @param string $language
     */
    public function __construct($minLat,$minLon,$maxLat,$maxLon,$overpassEndpointURL,$wikidataEndpointURL,$language) {
        //$this->overpassQuery = new BBoxEtymologyOverpassQuery($minLat, $minLon, $maxLat, $maxLon, $overpassEndpointURL);
        parent::__construct($minLat, $minLon, $maxLat, $maxLon, $overpassEndpointURL);

        $this->language = $language;
        $this->wikidataEndpointURL = $wikidataEndpointURL;
    }

    public function send()
    {
        //$overpassResult = $this->overpassQuery->send();
        $overpassResult = parent::send();
        if (!$overpassResult->isSuccessful() || !$overpassResult->hasResult()) {
            $out = $overpassResult;
        } else {
            $overpassGeoJSON = $overpassResult->getGeoJSONData();
            if (empty($overpassGeoJSON["features"])) {
                $out = $overpassResult;
            } else {
                $wikidataQuery = new GeoJSONEtymologyWikidataQuery($overpassGeoJSON, $this->language, $this->wikidataEndpointURL);
                $wikidataResult=$wikidataQuery->send();

                $out = $wikidataResult;
            }
        }

        return $out;
    }
}