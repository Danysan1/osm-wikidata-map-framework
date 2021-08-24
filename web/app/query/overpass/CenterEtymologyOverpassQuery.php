<?php

namespace App\Query\Overpass;

require_once(__DIR__ . "/OverpassQuery.php");
require_once(__DIR__ . "/../GeoJSONQuery.php");
require_once(__DIR__ . "/../../result/overpass/OverpassEtymologyQueryResult.php");
require_once(__DIR__ . "/../../result/QueryResult.php");
require_once(__DIR__ . "/../../result/GeoJSONQueryResult.php");

use \App\Query\Overpass\OverpassQuery;
use \App\Query\GeoJSONQuery;
use \App\Result\Overpass\OverpassEtymologyQueryResult;
use \App\Result\QueryResult;
use \App\Result\GeoJSONQueryResult;

/**
 * OverpassQL query that retrieves all the details of any item which has an etymology in the vicinity of a central point.
 * 
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
    public function getCenterLat(): float
    {
        return $this->lat;
    }

    /**
     * @return float
     */
    public function getCenterLon(): float
    {
        return $this->lon;
    }

    /**
     * @return float
     */
    public function getRadius(): float
    {
        return $this->radius;
    }

    /**
     * @return GeoJSONQueryResult
     */
    public function send(): QueryResult
    {
        $res = parent::send();
        if (!$res->isSuccessful() || !$res->hasResult()) {
            error_log("CenterEtymologyOverpassQuery: Overpass query failed: $res");
            throw new \Exception("Overpass query failed");
        }
        return new OverpassEtymologyQueryResult($res->isSuccessful(), $res->getArray());
    }
}
