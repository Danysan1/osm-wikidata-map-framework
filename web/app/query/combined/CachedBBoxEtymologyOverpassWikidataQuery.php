<?php

namespace App\Query\Combined;

require_once(__DIR__ . "/../CachedBBoxQuery.php");
require_once(__DIR__ . "/BBoxEtymologyOverpassWikidataQuery.php");

use \App\Query\CachedBBoxQuery;
use \App\Query\Combined\BBoxEtymologyOverpassWikidataQuery;

/**
 * Cached version of BBoxEtymologyOverpassWikidataQuery
 * 
 * @see BBoxEtymologyOverpassWikidataQuery
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class CachedBBoxEtymologyOverpassWikidataQuery extends CachedBBoxQuery
{
    /**
     * @param float $minLat
     * @param float $minLon
     * @param float $maxLat
     * @param float $maxLon
     * @param string $overpassEndpointURL
     * @param string $wikidataEndpointURL
     * @param string $language
     * @param string $cacheFileBasePath
     * @param int $cacheTimeoutHours
     */
    public function __construct($minLat, $minLon, $maxLat, $maxLon, $overpassEndpointURL, $wikidataEndpointURL, $language, $cacheFileBasePath, $cacheTimeoutHours)
    {
        parent::__construct(
            new BBoxEtymologyOverpassWikidataQuery($minLat, $minLon, $maxLat, $maxLon, $overpassEndpointURL, $wikidataEndpointURL, $language),
            $cacheFileBasePath,
            $cacheTimeoutHours
        );
    }
}
