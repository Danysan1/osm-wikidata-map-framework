<?php

namespace App\Query\Caching;

require_once(__DIR__ . "/CSVCachedQuery.php");
require_once(__DIR__ . "/../BBoxQuery.php");
require_once(__DIR__ . "/../../result/QueryResult.php");
require_once(__DIR__ . "/../../ServerTiming.php");
require_once(__DIR__ . "/../../BaseBoundingBox.php");
require_once(__DIR__ . "/../../Configuration.php");

use App\Query\Caching\CSVCachedQuery;
use App\Query\BBoxQuery;
use \App\Result\QueryResult;
use \App\ServerTiming;
use \App\BaseBoundingBox;
use \App\BoundingBox;
use \App\Configuration;

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
abstract class CSVCachedBBoxQuery extends CSVCachedQuery implements BBoxQuery
{
    /**
     * @param BBoxQuery $baseQuery
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
        if (!$baseQuery instanceof BBoxQuery) {
            throw new \Exception("Base query is not a BBoxQuery");
        }
        return $baseQuery->getBBox();
    }

    protected function shouldKeepRow(array $row): bool
    {
        $newBBox = $this->getBBox();
        return $this->baseShouldKeepRow(
            $row,
            BBOX_CACHE_COLUMN_TIMESTAMP,
            BBOX_CACHE_COLUMN_RESULT,
            [$this, "getBBoxFromRow"],
            [$newBBox, "strictlyContains"]
        );
    }

    protected abstract function getResultFromFilePath(string $fileRelativePath): QueryResult;

    /**
     * @return QueryResult|null
     */
    protected function getResultFromRow(array $row)
    {
        $rowBBox = $this->getBBoxFromRow($row);
        if ($rowBBox->containsOrEquals($this->getBBox())) {
            // Row bbox contains entirely the query bbox, cache hit!
            $fileRelativePath = (string)$row[BBOX_CACHE_COLUMN_RESULT];
            $result = $this->getResultFromFilePath($fileRelativePath);
            //error_log(get_class($this).": " . $rowBBox . " contains " . $this->getBBox());
            /*error_log(
                get_class($this)." - cache hit:" . PHP_EOL .
                    $this->getBBox() . " VS " . $rowBBox . PHP_EOL .
                    "Result: " . $fileRelativePath
            );*/
        } else {
            /*error_log(
                get_class($this)." - no cache hit:" . PHP_EOL .
                    $this->getBBox() . " VS " . $rowBBox
            );*/
            $result = null;
        }
        return $result;
    }

    protected abstract function getRowDataFromResult(QueryResult $result): string;

    protected abstract function getExtension(): string;

    protected function getRowFromResult(QueryResult $result): array
    {
        $rowData = $this->getRowDataFromResult($result);
        $hash = sha1($rowData);
        $fileRelativePath = $hash . "." . $this->getExtension();
        $fileAbsolutePath = (string)$this->getConfig()->get("cache_file_base_path") . $fileRelativePath;
        file_put_contents($fileAbsolutePath, $rowData);

        $newRow = [
            BBOX_CACHE_COLUMN_TIMESTAMP => time(),
            BBOX_CACHE_COLUMN_MIN_LAT => $this->getBBox()->getMinLat(),
            BBOX_CACHE_COLUMN_MAX_LAT => $this->getBBox()->getMaxLat(),
            BBOX_CACHE_COLUMN_MIN_LON => $this->getBBox()->getMinLon(),
            BBOX_CACHE_COLUMN_MAX_LON => $this->getBBox()->getMaxLon(),
            BBOX_CACHE_COLUMN_RESULT => $fileRelativePath
        ];
        return $newRow;
    }

    public function getBBoxFromRow(array $row): BoundingBox
    {
        $rowMinLat = (float)$row[BBOX_CACHE_COLUMN_MIN_LAT];
        $rowMaxLat = (float)$row[BBOX_CACHE_COLUMN_MAX_LAT];
        $rowMinLon = (float)$row[BBOX_CACHE_COLUMN_MIN_LON];
        $rowMaxLon = (float)$row[BBOX_CACHE_COLUMN_MAX_LON];
        return new BaseBoundingBox($rowMinLat, $rowMinLon, $rowMaxLat, $rowMaxLon);
    }
}
