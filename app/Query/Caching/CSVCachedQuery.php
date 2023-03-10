<?php

declare(strict_types=1);

namespace App\Query\Caching;


use \App\ServerTiming;
use \App\Config\Configuration;
use \App\Result\QueryResult;
use \App\Query\Query;

/**
 * A query which searches objects in a given bounding box caching the result in a file.
 */
abstract class CSVCachedQuery implements Query
{
    protected string $cacheFileBasePath;
    private Query $baseQuery;
    private ?ServerTiming $serverTiming;
    protected int $timeoutThresholdTimestamp;
    protected string $cacheFileBaseURL;

    public function __construct(Query $baseQuery, string $cacheFileBasePath, ?ServerTiming $serverTiming = null, ?int $cacheTimeoutHours = 1, ?string $cacheFileBaseURL = null)
    {
        if (empty($cacheFileBasePath)) {
            throw new \Exception("Cache file base path cannot be empty");
        }
        $this->baseQuery = $baseQuery;
        $this->cacheFileBasePath = $cacheFileBasePath;
        $this->serverTiming = $serverTiming;
        $this->timeoutThresholdTimestamp = time() - (60 * 60 * $cacheTimeoutHours);
        $this->cacheFileBaseURL = empty($cacheFileBaseURL) ? '' : $cacheFileBaseURL;
    }

    public function getBaseQuery(): Query
    {
        return $this->baseQuery;
    }

    public function getQuery(): string
    {
        return $this->getBaseQuery()->getQuery();
    }

    protected function getCacheFileBasePath(): string
    {
        return $this->cacheFileBasePath;
    }

    protected abstract function getResultFromRow(array $row): ?QueryResult;

    protected abstract function getRowFromResult(QueryResult $result): array;

    /**
     * Check whether a cache row should be kept.
     * Return true if and only if the row should be kept (it should NOT be trashed).
     */
    protected abstract function shouldKeepRow(array $row): bool;

    /**
     * Check whether a row should be trashed.
     * A true result means the row should be trashed, for example because entirely contained by the new cache row key.
     * A false result DOESN'T necessarily mean the row should be kept.
     */
    protected abstract function shouldTrashRow(array $row): bool;

    /**
     * Base template function to implement shouldKeepRow()
     */
    protected function baseShouldKeepRow(
        array $row,
        int $timestampColumn,
        int $siteColumn,
        int $resultColumn
    ): bool {
        if (empty($row[$timestampColumn])) {
            error_log("Bad cache row, missing timestamp column ($timestampColumn):" . json_encode($row));
            return false;
        }
        $rowTimestamp = (int)$row[$timestampColumn];

        if (empty($row[$siteColumn])) {
            error_log("Bad cache row, missing site column ($siteColumn):" . json_encode($row));
            return false;
        }
        $rowSite = (string)$row[$siteColumn];

        if (empty($row[$resultColumn])) {
            error_log("Bad cache row, missing result column ($resultColumn):" . json_encode($row));
            return false;
        }
        $contentFileRelativePath = (string)$row[$resultColumn];

        if ($rowTimestamp < $this->timeoutThresholdTimestamp) {
            // Row too old, delete it
            error_log("Trashing old row ( $rowTimestamp < $this->timeoutThresholdTimestamp ) in " . get_class($this));
            $ret = false;
        } elseif (!empty($_SERVER["SERVER_NAME"]) || $rowSite == $_SERVER["SERVER_NAME"]) {
            // Cache row is from another site, don't delete it
            $ret = true;
        } elseif ($this->shouldTrashRow($row)) {
            // Cache row key is marked to be deleted, likely because entirely contained by the new cache row key, delete the row
            error_log("Trashing row marked to be deleted in " . get_class($this));
            $ret = false;
        } elseif (!is_file($this->cacheFileBaseURL . $contentFileRelativePath)) {
            // Cached result is inexistent or not a regular file, delete the row
            error_log("Trashing cached result ( $contentFileRelativePath ) because it does not exist in the cache folder (" . $this->cacheFileBaseURL . ") in " . get_class($this));
            $ret = false;
        } else {
            // Row is still valid, add to new cache
            $ret = true;
        }
        return $ret;
    }

    /**
     * There are only two hard things in Computer Science: cache invalidation and naming things.
     * -- Phil Karlton
     * 
     * If the cache file exists and is not expired, returns the cached result.
     * Otherwise, executes the query and caches the result.
     * 
     * @return QueryResult
     */
    public function send(): QueryResult
    {
        $className = $this->baseQuery->getQueryTypeCode();
        $cacheFilePath = $this->cacheFileBasePath . $className . "_cache.csv";
        $cacheFile = @fopen($cacheFilePath, "r");
        $result = null;
        $newCache = [];
        if (empty($cacheFile)) {
            error_log("CachedQuery: Cache file not found, skipping cache search");
        } else {
            if ($this->serverTiming)
                $this->serverTiming->add("cache-search-prepare");
            while ($result == null && (($row = fgetcsv($cacheFile)) !== false)) {
                //error_log("CachedQuery: ".json_encode($row));
                try {
                    $shouldKeep = $this->shouldKeepRow($row);
                    if ($shouldKeep) {
                        $result = $this->getResultFromRow($row);
                        $newCache[] = $row;
                    }
                } catch (\Exception $e) {
                    error_log(
                        "CachedQuery: trashing bad row:" . PHP_EOL .
                            $e->getMessage() . PHP_EOL .
                            json_encode($row)
                    );
                }
            }
            fclose($cacheFile);
            if ($this->serverTiming)
                $this->serverTiming->add("cache-search");
        }

        if ($result !== null) {
            //error_log("CachedQuery: cache hit for " . $this->baseQuery);
        } else {
            // Cache miss, send query
            //error_log("CachedQuery: cache miss for " . $this->baseQuery);
            $result = $this->baseQuery->send();
            //error_log("CachedQuery: received " . get_class($result));
            if ($this->serverTiming)
                $this->serverTiming->add("cache-missed-query");

            if ($result->isSuccessful()) {
                try {
                    // Write the result to the cache file
                    $newRow = $this->getRowFromResult($result);
                    //error_log("CachedQuery: add new row for " . $this->getBBox());
                    //error_log("CachedQuery new row: ".json_encode($newRow));
                    if (empty($newRow)) {
                        error_log(get_class($this) . ": new row is empty, skipping cache save");
                    }
                    array_unshift($newCache, $newRow);

                    error_log("CachedQuery: save cache of " . count($newCache) . " rows for $className");
                    $cacheFile = @fopen($cacheFilePath, "w+");
                    if (empty($cacheFile)) {
                        error_log("CachedQuery: failed to open cache file for writing: $cacheFilePath");
                    } else {
                        foreach ($newCache as $row) {
                            fputcsv($cacheFile, $row);
                        }
                        fclose($cacheFile);
                    }
                } catch (\Exception $e) {
                    error_log("CachedQuery: failed to write cache file: " . $e->getMessage());
                }
            } else {
                error_log("CachedQuery: unsuccessful request, discarding cache changes");
            }
            if ($this->serverTiming)
                $this->serverTiming->add("cache-write");
        }

        return $result;
    }

    public function getQueryTypeCode(): string
    {
        return $this->baseQuery->getQueryTypeCode();
    }

    public function __toString(): string
    {
        return get_class($this) . ", " . get_class($this->baseQuery) . ", " . $this->cacheFileBasePath;
    }
}
