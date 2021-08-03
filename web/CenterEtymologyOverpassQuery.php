<?php
require_once("./OverpassQuery.php");

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
class CenterEtymologyOverpassQuery extends OverpassQuery {
    /**
     * @var float
     */
    private $lat, $lon, $radius;

    /**
     * @param float $lat
     * @param float $lon
     * @param float $radius
     */
    public function __construct($lat,$lon,$radius) {
        parent::__construct(
            "[out:json][timeout:25];
            (
              node['name:etymology:wikidata'](around:$radius,$lat,$lon);
              way['name:etymology:wikidata'](around:$radius,$lat,$lon);
              relation['name:etymology:wikidata'](around:$radius,$lat,$lon);
            );
            out body;
            >;
            out skel qt;"
        );
        $this->lat = $lat;
        $this->lon = $lon;
        $this->radius = $radius;
    }

    /**
     * @return float
     */
    public function getCenterLat() {
        return $this->lat;
    }

    /**
     * @return float
     */
    public function getCenterLon() {
        return $this->lon;
    }

    /**
     * @return float
     */
    public function getRadius() {
        return $this->radius;
    }
}
