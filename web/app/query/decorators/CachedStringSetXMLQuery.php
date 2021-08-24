<?php

namespace App\Query\Decorators;

require_once(__DIR__ . "/../StringSetXMLQuery.php");
require_once(__DIR__ . "/../../result/QueryResult.php");
require_once(__DIR__ . "/../../result/XMLQueryResult.php");
require_once(__DIR__ . "/../../result/XMLLocalQueryResult.php");
require_once(__DIR__ . "/../../BaseStringSet.php");
require_once(__DIR__ . "/../../StringSet.php");
require_once(__DIR__ . "/../../ServerTiming.php");

use \App\Query\StringSetXMLQuery;
use \App\Result\XMLLocalQueryResult;
use \App\BaseStringSet;
use App\Result\XMLQueryResult;
use App\Result\QueryResult;
use \App\StringSet;
use \App\ServerTiming;

define("STRING_SET_CACHE_COLUMN_TIMESTAMP", 0);
define("STRING_SET_CACHE_COLUMN_SET", 1);
define("STRING_SET_CACHE_COLUMN_RESULT", 2);

/**
 * A query which searches objects in a given bounding box caching the result in a file.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class CachedStringSetXMLQuery implements StringSetXMLQuery
{
    /** @var string $cacheFileBasePath */
    private $cacheFileBasePath;

    /** @var int $cacheTimeoutHours */
    private $cacheTimeoutHours;

    /** @var StringSetXMLQuery $baseQuery */
    private $baseQuery;

    /** @var ServerTiming|null $serverTiming */
    private $serverTiming;

    /**
     * @param StringSetXMLQuery $baseQuery
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

    public function getStringSet(): StringSet
    {
        return $this->baseQuery->getStringSet();
    }

    public function getQuery(): string
    {
        return $this->baseQuery->getQuery();
    }

    /**
     * If the cache file exists and is not expired, returns the cached result.
     * Otherwise, executes the query and caches the result.
     * 
     * @return XMLQueryResult
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
            error_log("CachedStringSetXMLQuery: Cache file not found, skipping cache search");
        } else {
            if ($this->serverTiming) $this->serverTiming->add("cache_search_prepare");
            while ($result == null && (($row = fgetcsv($cacheFile)) !== false)) {
                //error_log("CachedStringSetXMLQuery: ".json_encode($row));
                $rowTimestamp = (int)$row[STRING_SET_CACHE_COLUMN_TIMESTAMP];
                $rowStringSet = BaseStringSet::fromJSON((string)$row[STRING_SET_CACHE_COLUMN_SET]);
                if ($rowTimestamp < $timeoutThresholdTimestamp) {
                    // Row too old, ignore
                    error_log("CachedStringSetXMLQuery: trashing old row ($rowTimestamp < $timeoutThresholdTimestamp)");
                } elseif ($this->getStringSet()->strictlyContains($rowStringSet)) {
                    // Cache row bbox is entirely contained by the new query bbox, ignore the cache row
                    error_log("CachedStringSetXMLQuery: trashing smaller bbox row");
                } else {
                    // Row is still valid, add to new cache
                    array_push($newCache, $row);
                    if ($rowStringSet->containsOrEquals($this->getStringSet())) {
                        // Row bbox contains entirely the query bbox, cache hit!
                        /** @var array $cachedResult */
                        $cachedResult = json_decode((string)$row[STRING_SET_CACHE_COLUMN_RESULT], true);
                        $result = new XMLLocalQueryResult(true, $cachedResult);
                        //error_log("CachedStringSetXMLQuery: " . $rowBBox . " contains " . $this->getBBox());
                        //error_log("CachedStringSetXMLQuery: cache hit for " . $this->getBBox());
                    } else {
                        //error_log("CachedStringSetXMLQuery: " . $rowBBox . " does not contain " . $this->getBBox());
                    }
                }
            }
            fclose($cacheFile);
            if ($this->serverTiming) $this->serverTiming->add("cache_search");
        }

        if ($result == null) {
            // Cache miss, send query to Overpass
            error_log("CachedStringSetXMLQuery: cache miss for " . $this->getStringSet());
            /**
             * @var XMLQueryResult
             */
            $result = $this->baseQuery->send();
            if ($this->serverTiming) $this->serverTiming->add("cache_missed_query");

            if ($result->isSuccessful()) {
                // Write the result to the cache file
                $newRow = [
                    STRING_SET_CACHE_COLUMN_TIMESTAMP => time(),
                    STRING_SET_CACHE_COLUMN_SET => $this->getStringSet()->toJson(),
                    STRING_SET_CACHE_COLUMN_RESULT => $result->getXML()
                ];
                //error_log("CachedStringSetXMLQuery: add new row for " . $this->getBBox());
                //error_log("CachedStringSetXMLQuery new row: ".json_encode($newRow));
                array_unshift($newCache, $newRow);

                error_log("CachedStringSetXMLQuery: save cache of " . count($newCache) . " rows");
                $cacheFile = @fopen($cacheFilePath, "w+");
                if (empty($cacheFile)) {
                    error_log("CachedStringSetXMLQuery: failed to open cache file for writing");
                } else {
                    foreach ($newCache as $row) {
                        fputcsv($cacheFile, $row);
                    }
                    fclose($cacheFile);
                }
            } else {
                error_log("CachedStringSetXMLQuery: unsuccessful request to Overpass, discarding cache changes");
            }
            if ($this->serverTiming) $this->serverTiming->add("cache_write");
        }

        return $result;
    }
}
