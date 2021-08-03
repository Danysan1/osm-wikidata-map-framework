<?php
require_once("./BBoxGeoJSONQuery.php");
require_once("./GeoJSONQueryResult.php");
require_once("./GeoJSONLocalQueryResult.php");
require_once("./Configuration.php");

define("CACHE_COLUMN_TIMESTAMP", 0);
define("CACHE_COLUMN_MIN_LAT", 1);
define("CACHE_COLUMN_MAX_LAT", 2);
define("CACHE_COLUMN_MIN_LON", 3);
define("CACHE_COLUMN_MAX_LON", 4);
define("CACHE_COLUMN_RESULT", 5);

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
class CachedBBoxQuery implements BBoxGeoJSONQuery
{
    /**
     * @var Configuration
     */
    private $config;

    /**
     * @var BBoxGeoJSONQuery
     */
    private $baseQuery;

    /**
     * @param BBoxGeoJSONQuery $baseQuery
     * @param Configuration $config
     */
    public function __construct($baseQuery, $config)
    {
        $this->baseQuery = $baseQuery;
        $this->config = $config;
    }

    public function getMinLat()
    {
        return $this->baseQuery->getMinLat();
    }

    public function getMaxLat()
    {
        return $this->baseQuery->getMaxLat();
    }

    public function getMinLon()
    {
        return $this->baseQuery->getMinLon();
    }
    
    public function getMaxLon()
    {
        return $this->baseQuery->getMaxLon();
    }

    public function getQuery()
    {
        return $this->baseQuery->getQuery();
    }

    /**
     * There are only two hard things in Computer Science: cache invalidation and naming things.
     * -- Phil Karlton
     * 
     * @param string $endpoint
     * @return GeoJSONQueryResult
     */
    public function send($endpoint)
    {
        $cacheFileBasePath = (string)$this->config->get("cache-file-base-path");
        $cacheTimeoutHours = (int)$this->config->get("cache-timeout-hours");
        if (empty($cacheFileBasePath) || empty($cacheTimeoutHours)) {
            return $this->baseQuery->send($endpoint);
        } else {
            $cacheFilePath = $cacheFileBasePath.($this->baseQuery::class)."_cache.csv";
            $cacheFile = @fopen($cacheFilePath, "r");
            $timeoutThresholdTimestamp = time() - (60 * 60 * $cacheTimeoutHours);
            $result = null;
            $newCache = [];
            if (!empty($cacheFile)) {
                while ($result == null && (($row = fgetcsv($cacheFile)) !== false)) {
                    //error_log("CachedBBoxEtymologyOverpassQuery::send old: ".json_encode($row));
                    $rowTimestamp = (int)$row[CACHE_COLUMN_TIMESTAMP];
                    $rowMinLat = (float)$row[CACHE_COLUMN_MIN_LAT];
                    $rowMaxLat = (float)$row[CACHE_COLUMN_MAX_LAT];
                    $rowMinLon = (float)$row[CACHE_COLUMN_MIN_LON];
                    $rowMaxLon = (float)$row[CACHE_COLUMN_MAX_LON];
                    if ($rowTimestamp < $timeoutThresholdTimestamp) {
                        // Row too old, ignore
                        error_log("CachedBBoxEtymologyOverpassQuery::send: trashing old row ($rowTimestamp < $timeoutThresholdTimestamp)");
                    } elseif (
                            $rowMaxLat<=$this->getMaxLat() &&
                            $rowMinLat>=$this->getMinLat() &&
                            $rowMaxLon<=$this->getMaxLon() &&
                            $rowMinLon>=$this->getMinLon()
                        ){
                        // Row bbox is entirely contained by the query bbox, ignore
                        error_log("CachedBBoxEtymologyOverpassQuery::send: trashing smaller bbox row");
                    } else {
                        // Row is still valid, add to new cache
                        array_push($newCache, $row);
                            if (
                                $rowMaxLat>=$this->getMaxLat() &&
                                $rowMinLat<=$this->getMinLat() &&
                                $rowMaxLon>=$this->getMaxLon() &&
                                $rowMinLon<=$this->getMinLon()
                            ) {
                            // Row bbox contains entirely the query bbox, cache hit!
                            $result = new GeoJSONLocalQueryResult(true, json_decode((string)$row[CACHE_COLUMN_RESULT], true));
                            error_log("CachedBBoxEtymologyOverpassQuery::send: cache hit for ".$this->getMinLat()."/".$this->getMinLon()."/".$this->getMaxLat()."/".$this->getMaxLon());
                        }
                    }
                }
                fclose($cacheFile);
            }

            if ($result == null) {
                // Cache miss, send query to Overpass
                error_log("CachedBBoxEtymologyOverpassQuery::send: cache miss for ".$this->getMinLat()."/".$this->getMinLon()."/".$this->getMaxLat()."/".$this->getMaxLon());
                /**
                 * @var GeoJSONQueryResult
                 */
                $result = $this->baseQuery->send($endpoint);

                if ($result->isSuccessful()) {
                    // Write the result to the cache file
                    $newRow = [
                        CACHE_COLUMN_TIMESTAMP => time(),
                        CACHE_COLUMN_MIN_LAT => $this->getMinLat(),
                        CACHE_COLUMN_MAX_LAT => $this->getMaxLat(),
                        CACHE_COLUMN_MIN_LON => $this->getMinLon(),
                        CACHE_COLUMN_MAX_LON => $this->getMaxLon(),
                        CACHE_COLUMN_RESULT => $result->getGeoJSON()
                    ];
                    //error_log("CachedBBoxEtymologyOverpassQuery::send new: ".json_encode($newRow));
                    array_unshift($newCache, $newRow);

                    error_log("CachedBBoxEtymologyOverpassQuery::send: save cache of ".count($newCache)." rows");
                    $cacheFile = fopen($cacheFilePath, "w+");
                    foreach ($newCache as $row) {
                        fputcsv($cacheFile, $row);
                    }
                    fclose($cacheFile);
                } else {
                    error_log("CachedBBoxEtymologyOverpassQuery::send: unsuccessful request to Overpass, discarding cache changes");
                }
            }

            return $result;
        }
    }
}
