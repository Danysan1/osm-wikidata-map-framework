<?php

declare(strict_types=1);

namespace App\Query\Caching;


use \App\Query\Caching\CSVCachedQuery;
use \App\Query\BBoxQuery;
use \App\Result\QueryResult;
use \App\ServerTiming;
use \App\BaseBoundingBox;
use \App\BoundingBox;
use \App\Config\Configuration;

/**
 * A query which searches objects in a given bounding box caching the result in a file.
 */
abstract class CSVCachedBBoxQuery extends CSVCachedQuery implements BBoxQuery
{
    public const BBOX_CACHE_COLUMN_TIMESTAMP = 0;
    public const BBOX_CACHE_COLUMN_MIN_LAT = 1;
    public const BBOX_CACHE_COLUMN_MAX_LAT = 2;
    public const BBOX_CACHE_COLUMN_MIN_LON = 3;
    public const BBOX_CACHE_COLUMN_MAX_LON = 4;
    public const BBOX_CACHE_COLUMN_SITE = 5;
    public const BBOX_CACHE_COLUMN_RESULT = 6;

    public function getBBox(): BoundingBox
    {
        $baseQuery = $this->getBaseQuery();
        if (!$baseQuery instanceof BBoxQuery) {
            throw new \Exception("Base query is not a BBoxQuery");
        }
        return $baseQuery->getBBox();
    }

    protected function shouldTrashRow(array $row): bool
    {
        return $this->getBBox()->strictlyContains($this->getBBoxFromRow($row));
    }

    protected function shouldKeepRow(array $row): bool
    {
        return $this->baseShouldKeepRow(
            $row,
            self::BBOX_CACHE_COLUMN_TIMESTAMP,
            self::BBOX_CACHE_COLUMN_SITE,
            self::BBOX_CACHE_COLUMN_RESULT
        );
    }

    protected abstract function getResultFromFilePath(string $fileRelativePath): QueryResult;

    protected function getResultFromRow(array $row): ?QueryResult
    {
        $rowSite = (string)$row[self::BBOX_CACHE_COLUMN_SITE];
        $okSite = empty($_SERVER["SERVER_NAME"]) || $rowSite == $_SERVER["SERVER_NAME"];

        $rowBBox = $this->getBBoxFromRow($row);
        if ($okSite && $rowBBox->containsOrEquals($this->getBBox())) {
            // Row bbox contains entirely the query bbox, cache hit!
            $fileRelativePath = (string)$row[self::BBOX_CACHE_COLUMN_RESULT];
            $result = $this->getResultFromFilePath($fileRelativePath);
            //error_log(get_class($this).": " . $rowBBox . " contains " . $this->getBBox());
        } else {
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
        $fileAbsolutePath = $this->cacheFileBasePath . $fileRelativePath;
        $writtenBytes = @file_put_contents($fileAbsolutePath, $rowData);
        if (!$writtenBytes)
            error_log("Failed writing cache to $fileAbsolutePath");

        $newRow = [
            self::BBOX_CACHE_COLUMN_TIMESTAMP => time(),
            self::BBOX_CACHE_COLUMN_MIN_LAT => $this->getBBox()->getMinLat(),
            self::BBOX_CACHE_COLUMN_MAX_LAT => $this->getBBox()->getMaxLat(),
            self::BBOX_CACHE_COLUMN_MIN_LON => $this->getBBox()->getMinLon(),
            self::BBOX_CACHE_COLUMN_MAX_LON => $this->getBBox()->getMaxLon(),
            self::BBOX_CACHE_COLUMN_SITE => empty($_SERVER["SERVER_NAME"]) ? "" : $_SERVER["SERVER_NAME"],
            self::BBOX_CACHE_COLUMN_RESULT => $fileRelativePath
        ];
        return $newRow;
    }

    private function getBBoxFromRow(array $row): BoundingBox
    {
        $rowMinLat = (float)$row[self::BBOX_CACHE_COLUMN_MIN_LAT];
        $rowMaxLat = (float)$row[self::BBOX_CACHE_COLUMN_MAX_LAT];
        $rowMinLon = (float)$row[self::BBOX_CACHE_COLUMN_MIN_LON];
        $rowMaxLon = (float)$row[self::BBOX_CACHE_COLUMN_MAX_LON];
        return new BaseBoundingBox($rowMinLat, $rowMinLon, $rowMaxLat, $rowMaxLon);
    }
}
