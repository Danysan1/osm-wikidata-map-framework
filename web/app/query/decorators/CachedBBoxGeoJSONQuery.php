<?php

namespace App\Query\Decorators;

require_once(__DIR__ . "/CachedQuery.php");
require_once(__DIR__ . "/../BBoxGeoJSONQuery.php");
require_once(__DIR__ . "/../../result/QueryResult.php");
require_once(__DIR__ . "/../../result/GeoJSONQueryResult.php");
require_once(__DIR__ . "/../../result/GeoJSONLocalQueryResult.php");
require_once(__DIR__ . "/../../ServerTiming.php");
require_once(__DIR__ . "/../../BaseBoundingBox.php");
require_once(__DIR__ . "/../../Configuration.php");

use \App\Query\Decorators\CachedQuery;
use \App\Query\BBoxGeoJSONQuery;
use \App\Result\GeoJSONQueryResult;
use \App\Result\GeoJSONLocalQueryResult;
use \App\ServerTiming;
use \App\BaseBoundingBox;
use \App\BoundingBox;
use \App\Configuration;
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
class CachedBBoxGeoJSONQuery extends CachedQuery implements BBoxGeoJSONQuery
{
    /**
     * @param BBoxGeoJSONQuery $baseQuery
     * @param string $cacheFileBasePath
     * @param Configuration $config
     * @param ServerTiming|null $serverTiming
     */
    public function __construct($baseQuery, $cacheFileBasePath, $config, $serverTiming = null)
    {
        parent::__construct($baseQuery, $cacheFileBasePath, $config, $serverTiming);
    }

    public function getBBox(): BoundingBox
    {
        $baseQuery = $this->getBaseQuery();
        if (!$baseQuery instanceof BBoxGeoJSONQuery) {
            throw new \Exception("Base query is not a BBoxGeoJSONQuery");
        }
        return $baseQuery->getBBox();
    }

    protected function shouldKeepRow(array $row, int $timeoutThresholdTimestamp): bool
    {
        $rowTimestamp = (int)$row[BBOX_CACHE_COLUMN_TIMESTAMP];
        if ($rowTimestamp < $timeoutThresholdTimestamp) {
            // Row too old, ignore
            error_log("CachedBBoxGeoJSONQuery: trashing old row ($rowTimestamp < $timeoutThresholdTimestamp)");
            $ret = false;
        } elseif ($this->getBBox()->strictlyContains($this->getBBoxFromRow($row))) {
            // Cache row bbox is entirely contained by the new query bbox, ignore the cache row
            error_log("CachedBBoxGeoJSONQuery: trashing smaller bbox row");
            $ret = false;
        } else {
            // Row is still valid, add to new cache
            $ret = true;
        }
        return $ret;
    }

    /**
     * @return QueryResult|null
     */
    protected function getResultFromRow(array $row, int $timeoutThresholdTimestamp)
    {
        if ($this->getBBoxFromRow($row)->containsOrEquals($this->getBBox())) {
            // Row bbox contains entirely the query bbox, cache hit!
            $cacheFileBaseURL = (string)$this->getConfig()->get("cache-file-base-url");
            $jsonRelativePath = (string)$row[BBOX_CACHE_COLUMN_RESULT];
            $result = new GeoJSONLocalQueryResult(true, null, $cacheFileBaseURL . $jsonRelativePath);
            //error_log("CachedBBoxGeoJSONQuery: " . $rowBBox . " contains " . $this->getBBox());
            error_log("CachedBBoxGeoJSONQuery: cache hit for " . $this->getBBox());
        } else {
            //error_log("CachedBBoxGeoJSONQuery: " . $rowBBox . " does not contain " . $this->getBBox());
            $result = null;
        }
        return $result;
    }

    protected function getRowFromResult(QueryResult $result): array
    {
        if (!$result instanceof GeoJSONQueryResult) {
            throw new \Exception("Result is not a GeoJSONQueryResult");
        }
        $json = $result->getGeoJSON();
        $hash = sha1($json);
        $jsonRelativePath = $hash . ".geojson";
        $jsonAbsolutePath = $this->getCacheFileBasePath() . $jsonRelativePath;
        file_put_contents($jsonAbsolutePath, $json);

        $newRow = [
            BBOX_CACHE_COLUMN_TIMESTAMP => time(),
            BBOX_CACHE_COLUMN_MIN_LAT => $this->getBBox()->getMinLat(),
            BBOX_CACHE_COLUMN_MAX_LAT => $this->getBBox()->getMaxLat(),
            BBOX_CACHE_COLUMN_MIN_LON => $this->getBBox()->getMinLon(),
            BBOX_CACHE_COLUMN_MAX_LON => $this->getBBox()->getMaxLon(),
            BBOX_CACHE_COLUMN_RESULT => $jsonRelativePath
        ];
        return $newRow;
    }

    private function getBBoxFromRow(array $row): BoundingBox
    {
        $rowMinLat = (float)$row[BBOX_CACHE_COLUMN_MIN_LAT];
        $rowMaxLat = (float)$row[BBOX_CACHE_COLUMN_MAX_LAT];
        $rowMinLon = (float)$row[BBOX_CACHE_COLUMN_MIN_LON];
        $rowMaxLon = (float)$row[BBOX_CACHE_COLUMN_MAX_LON];
        return new BaseBoundingBox($rowMinLat, $rowMinLon, $rowMaxLat, $rowMaxLon);
    }
}
