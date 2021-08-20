<?php
require_once(__DIR__ . "/BBoxOverpassQuery.php");
require_once(__DIR__ . "/BBoxGeoJSONQuery.php");

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
class BBoxEtymologySkeletonOverpassQuery extends BBoxOverpassQuery
{
    /**
     * @param float $minLat
     * @param float $minLon
     * @param float $maxLat
     * @param float $maxLon
     * @param string $endpointURL
     */
    public function __construct($minLat, $minLon, $maxLat, $maxLon, $endpointURL)
    {
        parent::__construct(
            $minLat,
            $minLon,
            $maxLat,
            $maxLon,
            "[out:json][timeout:25];
            (
                way['name:etymology:wikidata']($minLat,$minLon,$maxLat,$maxLon);
            );
            out skel;
            >;
            out skel qt;",
            $endpointURL
        );
    }
}
