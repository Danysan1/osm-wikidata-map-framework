<?php
require_once(__DIR__."/OverpassQuery.php");
require_once(__DIR__."/BBoxGeoJSONQuery.php");

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
class BBoxEtymologyOverpassQuery extends OverpassQuery implements BBoxGeoJSONQuery {
    /**
     * @var float
     */
    private $minLat,$minLon,$maxLat,$maxLon;

    /**
     * @param float $minLat
     * @param float $minLon
     * @param float $maxLat
     * @param float $maxLon
     * @param string $endpointURL
     */
    public function __construct($minLat,$minLon,$maxLat,$maxLon,$endpointURL) {
        parent::__construct(
            "[out:json][timeout:25];
            (
                node['name:etymology:wikidata']($minLat,$minLon,$maxLat,$maxLon);
                way['name:etymology:wikidata']($minLat,$minLon,$maxLat,$maxLon);
                relation['name:etymology:wikidata']($minLat,$minLon,$maxLat,$maxLon);
            );
            out body;
            >;
            out skel qt;",
            $endpointURL
        );
        $this->minLat = $minLat;
        $this->minLon = $minLon;
        $this->maxLat = $maxLat;
        $this->maxLon = $maxLon;
    }

    /**
     * @return float
     */
    public function getMinLat() {
        return $this->minLat;
    }

    /**
     * @return float
     */
    public function getMinLon() {
        return $this->minLon;
    }

    /**
     * @return float
     */
    public function getMaxLat() {
        return $this->maxLat;
    }

    /**
     * @return float
     */
    public function getMaxLon() {
        return $this->maxLon;
    }
}
