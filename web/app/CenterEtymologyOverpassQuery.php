<?php
require_once(__DIR__ . "/OverpassQuery.php");
require_once(__DIR__ . "/GeoJSONQuery.php");
require_once(__DIR__ . "/OverpassEtymologyQueryResult.php");

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
class CenterEtymologyOverpassQuery extends OverpassQuery implements GeoJSONQuery
{
    /**
     * @var float
     */
    private $lat, $lon, $radius;

    /**
     * @param float $lat
     * @param float $lon
     * @param float $radius
     * @param string $endpointURL
     */
    public function __construct($lat, $lon, $radius, $endpointURL)
    {
        parent::__construct(
            "[out:json][timeout:25];
            (
              //node['name:etymology:wikidata'](around:$radius,$lat,$lon);
              way['name:etymology:wikidata'](around:$radius,$lat,$lon);
              //relation['name:etymology:wikidata'](around:$radius,$lat,$lon);
            );
            out body;
            >;
            out skel qt;",
            $endpointURL
        );
        $this->lat = $lat;
        $this->lon = $lon;
        $this->radius = $radius;
    }

    /**
     * @return float
     */
    public function getCenterLat()
    {
        return $this->lat;
    }

    /**
     * @return float
     */
    public function getCenterLon()
    {
        return $this->lon;
    }

    /**
     * @return float
     */
    public function getRadius()
    {
        return $this->radius;
    }

    /**
     * @return GeoJSONQueryResult
     */
    public function send()
    {
        $res = parent::send();
        if (!$res->isSuccessful() || !$res->hasResult()) {
            throw new Exception("Overpass query failed: $res");
        }
        return new OverpassEtymologyQueryResult($res->isSuccessful(), $res->getResult());
    }
}
