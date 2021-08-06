<?php
require_once(__DIR__."/BBoxEtymologyOverpassQuery.php");
require_once(__DIR__."/GeoJSONQueryResult.php");
require_once(__DIR__."/GeoJSONLocalQueryResult.php");
require_once(__DIR__."/Configuration.php");
require_once(__DIR__."/CachedBBoxQuery.php");

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
     * @param string $overpassEndpointURL
     * @param string $cacheFileBasePath
     * @param int $cacheTimeoutHours
     */
    public function __construct($minLat, $minLon, $maxLat, $maxLon, $overpassEndpointURL, $cacheFileBasePath, $cacheTimeoutHours)
    {
        parent::__construct(
            new BBoxEtymologyOverpassQuery($minLat, $minLon, $maxLat, $maxLon, $overpassEndpointURL),
            $cacheFileBasePath,
            $cacheTimeoutHours
        );
    }
}
