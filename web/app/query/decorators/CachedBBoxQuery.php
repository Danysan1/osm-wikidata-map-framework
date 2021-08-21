<?php

namespace App\Query\Decorators;

require_once(__DIR__ . "/../BBoxGeoJSONQuery.php");
require_once(__DIR__ . "/../../result/GeoJSONQueryResult.php");
require_once(__DIR__ . "/../../result/GeoJSONLocalQueryResult.php");
require_once(__DIR__ . "/../../ServerTiming.php");
require_once(__DIR__ . "/../../BaseBoundingBox.php");

use \App\Query\BBoxGeoJSONQuery;
use \App\Result\GeoJSONQueryResult;
use \App\Result\GeoJSONLocalQueryResult;
use \App\ServerTiming;
use App\BaseBoundingBox;

define("CACHE_COLUMN_TIMESTAMP", 0);
define("CACHE_COLUMN_MIN_LAT", 1);
define("CACHE_COLUMN_MAX_LAT", 2);
define("CACHE_COLUMN_MIN_LON", 3);
define("CACHE_COLUMN_MAX_LON", 4);
define("CACHE_COLUMN_RESULT", 5);

/**
 * A query which searches objects in a given bounding box caching the result in a file.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class CachedBBoxQuery implements BBoxGeoJSONQuery
{
    /** @var string $cacheFileBasePath */
    private $cacheFileBasePath;

    /** @var int $cacheTimeoutHours */
    private $cacheTimeoutHours;

    /** @var BBoxGeoJSONQuery */
    private $baseQuery;

    /** @var ServerTiming|null $serverTiming */
    private $serverTiming;

    /**
     * @param BBoxGeoJSONQuery $baseQuery
     * @param string $cacheFileBasePath
     * @param int $cacheTimeoutHours
     * @param ServerTiming|null $serverTiming
     */
    public function __construct($baseQuery, $cacheFileBasePath, $cacheTimeoutHours, $serverTiming = null)
    {
        if (empty($cacheFileBasePath)) {
            throw new \Exception("Cache file base path cannot be empty");
        }
        if (empty($cacheTimeoutHours)) {
            throw new \Exception("Cache timeout hours cannot be empty");
        }
        $this->baseQuery = $baseQuery;
        $this->cacheFileBasePath = $cacheFileBasePath;
        $this->cacheTimeoutHours = $cacheTimeoutHours;
        $this->serverTiming = $serverTiming;
    }

    public function getBBox()
    {
        return $this->baseQuery->getBBox();
    }

    public function getQuery()
    {
        return $this->baseQuery->getQuery();
    }

    /**
     * There are only two hard things in Computer Science: cache invalidation and naming things.
     * -- Phil Karlton
     * 
     * @return GeoJSONQueryResult
     */
    public function send()
    {
        $className = str_replace("\\", "_", get_class($this->baseQuery));
        $cacheFilePath = $this->cacheFileBasePath . $className . "_cache.csv";
        $cacheFile = @fopen($cacheFilePath, "r");
        $timeoutThresholdTimestamp = time() - (60 * 60 * $this->cacheTimeoutHours);
        $result = null;
        $newCache = [];
        if (empty($cacheFile)) {
            error_log("CachedBBoxQuery: Cache file not found, skipping cache search");
        } else {
            if ($this->serverTiming) $this->serverTiming->add("cache_search_prepare");
            while ($result == null && (($row = fgetcsv($cacheFile)) !== false)) {
                //error_log("CachedBBoxQuery: ".json_encode($row));
                $rowTimestamp = (int)$row[CACHE_COLUMN_TIMESTAMP];
                $rowMinLat = (float)$row[CACHE_COLUMN_MIN_LAT];
                $rowMaxLat = (float)$row[CACHE_COLUMN_MAX_LAT];
                $rowMinLon = (float)$row[CACHE_COLUMN_MIN_LON];
                $rowMaxLon = (float)$row[CACHE_COLUMN_MAX_LON];
                $rowBBox = new BaseBoundingBox($rowMinLat, $rowMinLon, $rowMaxLat, $rowMaxLon);
                if ($rowTimestamp < $timeoutThresholdTimestamp) {
                    // Row too old, ignore
                    error_log("CachedBBoxQuery: trashing old row ($rowTimestamp < $timeoutThresholdTimestamp)");
                } elseif ($this->getBBox()->strictlyContains($rowBBox)) {
                    // Cache row bbox is entirely contained by the new query bbox, ignore the cache row
                    error_log("CachedBBoxQuery: trashing smaller bbox row");
                } else {
                    // Row is still valid, add to new cache
                    array_push($newCache, $row);
                    if ($rowBBox->containsOrEquals($this->getBBox())) {
                        // Row bbox contains entirely the query bbox, cache hit!
                        /** @var array $cachedResult */
                        $cachedResult = json_decode((string)$row[CACHE_COLUMN_RESULT], true);
                        $result = new GeoJSONLocalQueryResult(true, $cachedResult);
                        //error_log("CachedBBoxQuery: " . $rowBBox . " contains " . $this->getBBox());
                        //error_log("CachedBBoxQuery: cache hit for " . $this->getBBox());
                    } else {
                        //error_log("CachedBBoxQuery: " . $rowBBox . " does not contain " . $this->getBBox());
                    }
                }
            }
            fclose($cacheFile);
            if ($this->serverTiming) $this->serverTiming->add("cache_search");
        }

        if ($result == null) {
            // Cache miss, send query to Overpass
            error_log("CachedBBoxQuery: cache miss for " . $this->getBBox());
            /**
             * @var GeoJSONQueryResult
             */
            $result = $this->baseQuery->send();
            if ($this->serverTiming) $this->serverTiming->add("cache_missed_query");

            if ($result->isSuccessful()) {
                // Write the result to the cache file
                $newRow = [
                    CACHE_COLUMN_TIMESTAMP => time(),
                    CACHE_COLUMN_MIN_LAT => $this->getBBox()->getMinLat(),
                    CACHE_COLUMN_MAX_LAT => $this->getBBox()->getMaxLat(),
                    CACHE_COLUMN_MIN_LON => $this->getBBox()->getMinLon(),
                    CACHE_COLUMN_MAX_LON => $this->getBBox()->getMaxLon(),
                    CACHE_COLUMN_RESULT => $result->getGeoJSON()
                ];
                //error_log("CachedBBoxQuery: add new row for " . $this->getBBox());
                //error_log("CachedBBoxQuery new row: ".json_encode($newRow));
                array_unshift($newCache, $newRow);

                error_log("CachedBBoxQuery: save cache of " . count($newCache) . " rows");
                $cacheFile = @fopen($cacheFilePath, "w+");
                if (empty($cacheFile)) {
                    error_log("CachedBBoxQuery: failed to open cache file for writing");
                } else {
                    foreach ($newCache as $row) {
                        fputcsv($cacheFile, $row);
                    }
                    fclose($cacheFile);
                }
            } else {
                error_log("CachedBBoxQuery: unsuccessful request to Overpass, discarding cache changes");
            }
            if ($this->serverTiming) $this->serverTiming->add("cache_write");
        }

        return $result;
    }
}
