<?php

namespace App\Query\Decorators;

require_once(__DIR__ . "/../BBoxGeoJSONQuery.php");
require_once(__DIR__ . "/../../result/QueryResult.php");
require_once(__DIR__ . "/../../result/GeoJSONQueryResult.php");
require_once(__DIR__ . "/../../result/GeoJSONLocalQueryResult.php");
require_once(__DIR__ . "/../../ServerTiming.php");
require_once(__DIR__ . "/../../BaseBoundingBox.php");

use \App\Query\BBoxGeoJSONQuery;
use \App\Result\GeoJSONQueryResult;
use \App\Result\GeoJSONLocalQueryResult;
use \App\ServerTiming;
use \App\BaseBoundingBox;
use \App\BoundingBox;
use \App\Result\QueryResult;

define("BBOX_CACHE_COLUMN_TIMESTAMP", 0);
define("BBOX_CACHE_COLUMN_MIN_LAT", 1);
define("BBOX_CACHE_COLUMN_MAX_LAT", 2);
define("BBOX_CACHE_COLUMN_MIN_LON", 3);
define("BBOX_CACHE_COLUMN_MAX_LON", 4);
define("BBOX_CACHE_COLUMN_RESULT", 5);

/**
 * A query which searches objects in a given bounding box caching the result in a file.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class CachedBBoxGeoJSONQuery implements BBoxGeoJSONQuery
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

    public function getBBox(): BoundingBox
    {
        return $this->baseQuery->getBBox();
    }

    public function getQuery(): string
    {
        return $this->baseQuery->getQuery();
    }

    /**
     * There are only two hard things in Computer Science: cache invalidation and naming things.
     * -- Phil Karlton
     * 
     * @return GeoJSONQueryResult
     */
    public function send(): QueryResult
    {
        $className = str_replace("\\", "_", get_class($this->baseQuery));
        $cacheFilePath = $this->cacheFileBasePath . $className . "_cache.csv";
        $cacheFile = @fopen($cacheFilePath, "r");
        $timeoutThresholdTimestamp = time() - (60 * 60 * $this->cacheTimeoutHours);
        $result = null;
        $newCache = [];
        if (empty($cacheFile)) {
            error_log("CachedBBoxGeoJSONQuery: Cache file not found, skipping cache search");
        } else {
            if ($this->serverTiming) $this->serverTiming->add("bbox_cache_search_prepare");
            while ($result == null && (($row = fgetcsv($cacheFile)) !== false)) {
                //error_log("CachedBBoxGeoJSONQuery: ".json_encode($row));
                $rowTimestamp = (int)$row[BBOX_CACHE_COLUMN_TIMESTAMP];
                $rowMinLat = (float)$row[BBOX_CACHE_COLUMN_MIN_LAT];
                $rowMaxLat = (float)$row[BBOX_CACHE_COLUMN_MAX_LAT];
                $rowMinLon = (float)$row[BBOX_CACHE_COLUMN_MIN_LON];
                $rowMaxLon = (float)$row[BBOX_CACHE_COLUMN_MAX_LON];
                $rowBBox = new BaseBoundingBox($rowMinLat, $rowMinLon, $rowMaxLat, $rowMaxLon);
                if ($rowTimestamp < $timeoutThresholdTimestamp) {
                    // Row too old, ignore
                    error_log("CachedBBoxGeoJSONQuery: trashing old row ($rowTimestamp < $timeoutThresholdTimestamp)");
                } elseif ($this->getBBox()->strictlyContains($rowBBox)) {
                    // Cache row bbox is entirely contained by the new query bbox, ignore the cache row
                    error_log("CachedBBoxGeoJSONQuery: trashing smaller bbox row");
                } else {
                    // Row is still valid, add to new cache
                    array_push($newCache, $row);
                    if ($rowBBox->containsOrEquals($this->getBBox())) {
                        // Row bbox contains entirely the query bbox, cache hit!
                        /** @var array $cachedResult */
                        $cachedResult = json_decode((string)$row[BBOX_CACHE_COLUMN_RESULT], true);
                        $result = new GeoJSONLocalQueryResult(true, $cachedResult);
                        //error_log("CachedBBoxGeoJSONQuery: " . $rowBBox . " contains " . $this->getBBox());
                        error_log("CachedBBoxGeoJSONQuery: cache hit for " . $this->getBBox());
                    } else {
                        //error_log("CachedBBoxGeoJSONQuery: " . $rowBBox . " does not contain " . $this->getBBox());
                    }
                }
            }
            fclose($cacheFile);
            if ($this->serverTiming) $this->serverTiming->add("bbox_cache_search");
        }

        if ($result == null) {
            // Cache miss, send query to Overpass
            error_log("CachedBBoxGeoJSONQuery: cache miss for " . $this->getBBox());
            /**
             * @var GeoJSONQueryResult
             */
            $result = $this->baseQuery->send();
            if ($this->serverTiming) $this->serverTiming->add("cache_missed_query");

            if ($result->isSuccessful()) {
                // Write the result to the cache file
                $newRow = [
                    BBOX_CACHE_COLUMN_TIMESTAMP => time(),
                    BBOX_CACHE_COLUMN_MIN_LAT => $this->getBBox()->getMinLat(),
                    BBOX_CACHE_COLUMN_MAX_LAT => $this->getBBox()->getMaxLat(),
                    BBOX_CACHE_COLUMN_MIN_LON => $this->getBBox()->getMinLon(),
                    BBOX_CACHE_COLUMN_MAX_LON => $this->getBBox()->getMaxLon(),
                    BBOX_CACHE_COLUMN_RESULT => $result->getGeoJSON()
                ];
                //error_log("CachedBBoxGeoJSONQuery: add new row for " . $this->getBBox());
                //error_log("CachedBBoxGeoJSONQuery new row: ".json_encode($newRow));
                array_unshift($newCache, $newRow);

                error_log("CachedBBoxGeoJSONQuery: save cache of " . count($newCache) . " rows");
                $cacheFile = @fopen($cacheFilePath, "w+");
                if (empty($cacheFile)) {
                    error_log("CachedBBoxGeoJSONQuery: failed to open cache file for writing");
                } else {
                    foreach ($newCache as $row) {
                        fputcsv($cacheFile, $row);
                    }
                    fclose($cacheFile);
                }
            } else {
                error_log("CachedBBoxGeoJSONQuery: unsuccessful request to Overpass, discarding cache changes");
            }
            if ($this->serverTiming) $this->serverTiming->add("cache_write");
        }

        return $result;
    }
}
