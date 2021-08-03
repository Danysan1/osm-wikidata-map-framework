<?php
require_once("./BBoxEtymologyOverpassQuery.php");
require_once("./GeoJSONQueryResult.php");
require_once("./GeoJSONLocalQueryResult.php");
require_once("./Configuration.php");
require_once("./CachedBBoxQuery.php");

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
class CachedBBoxEtymologyOverpassQuery extends CachedBBoxQuery
{
    /**
     * @param float $minLat
     * @param float $minLon
     * @param float $maxLat
     * @param float $maxLon
     * @param Configuration $config
     */
    public function __construct($minLat, $minLon, $maxLat, $maxLon, $config)
    {
        parent::__construct(new BBoxEtymologyOverpassQuery($minLat, $minLon, $maxLat, $maxLon), $config);
    }
}
