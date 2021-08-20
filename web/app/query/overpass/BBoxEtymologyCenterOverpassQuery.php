<?php

namespace App\Query\Overpass;

require_once(__DIR__ . "/BBoxOverpassQuery.php");
require_once(__DIR__ . "/../BBoxGeoJSONQuery.php");
require_once(__DIR__ . "/../../result/overpass/OverpassCenterQueryResult.php");

use \App\Query\Overpass\BBoxOverpassQuery;
use \App\Query\BBoxGeoJSONQuery;
use \App\Result\Overpass\OverpassCenterQueryResult;

/**
 * OverpassQL query that retrieves only the centroid and the id of any item in a bounding box which has an etymology.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class BBoxEtymologyCenterOverpassQuery extends BBoxOverpassQuery implements BBoxGeoJSONQuery
{
    /**
     * @var string $query
     */
    private $query;

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
                //node['name:etymology:wikidata']($minLat,$minLon,$maxLat,$maxLon);
                way['name:etymology:wikidata']($minLat,$minLon,$maxLat,$maxLon);
                //relation['name:etymology:wikidata']($minLat,$minLon,$maxLat,$maxLon);
            );
            out ids center;",
            $endpointURL
        );
    }

    /**
     * @return GeoJSONQueryResult
     */
    public function send()
    {
        $res = parent::send();
        if (!$res->isSuccessful() || !$res->hasResult()) {
            error_log("BBoxEtymologyCenterOverpassQuery: Overpass query failed: $res");
            throw new \Exception("Overpass query failed");
        }
        return new OverpassCenterQueryResult($res->isSuccessful(), $res->getResult());
    }
}
