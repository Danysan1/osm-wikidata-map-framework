<?php
require_once(__DIR__ . "/BBoxOverpassQuery.php");
require_once(__DIR__ . "/BBoxGeoJSONQuery.php");
require_once(__DIR__ . "/OverpassEtymologyQueryResult.php");

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
class BBoxEtymologyOverpassQuery extends BBoxOverpassQuery implements BBoxGeoJSONQuery
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
            out body;
            >;
            out skel qt;",
            $endpointURL
        );
    }

    /**
     * @return GeoJSONQueryResult
     */
    public function send() {
        $res = parent::send();
        if(!$res->isSuccessful() || !$res->hasResult()) {
            throw new Exception("Overpass query failed: $res");
        }
        return new OverpassEtymologyQueryResult($res->isSuccessful(), $res->getResult());
    }
}
