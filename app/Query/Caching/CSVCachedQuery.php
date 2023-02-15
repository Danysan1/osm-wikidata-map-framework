<?php

declare(strict_types=1);

namespace App\Query\Caching;


use \App\ServerTiming;
use \App\Config\Configuration;
use \App\Result\QueryResult;
use \App\Query\Query;

/**
 * A query which searches objects in a given bounding box caching the result in a file.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
abstract class CSVCachedQuery implements Query
{
    /** @var string $cacheFileBasePath */
    private $cacheFileBasePath;

    /** @var Configuration $config */
    private $config;

    /** @var Query */
    private $baseQuery;

    /** @var ServerTiming|null $serverTiming */
    private $serverTiming;

    /** @var int */
    protected $timeoutThresholdTimestamp;

    /** @var string */
    protected $cacheFileBaseURL;

    /**
     * @param Query $baseQuery
     * @param string $cacheFileBasePath
     * @param Configuration $config
     * @param ServerTiming|null $serverTiming
     */
    public function __construct($baseQuery, $cacheFileBasePath, $config, $serverTiming = null)
    {
        if (empty($cacheFileBasePath)) {
            throw new \Exception("Cache file base path cannot be empty");
        }
        $this->baseQuery = $baseQuery;
        $this->cacheFileBasePath = $cacheFileBasePath;
        $this->config = $config;
        $this->serverTiming = $serverTiming;

        $cacheTimeoutHours = (int)$config->get('cache_timeout_hours');
        $this->timeoutThresholdTimestamp = time() - (60 * 60 * $cacheTimeoutHours);

        $this->cacheFileBaseURL = (string)$this->getConfig()->get("cache_file_base_url");
    }

    public function getBaseQuery(): Query
    {
        return $this->baseQuery;
    }

    public function getQuery(): string
    {
        return $this->getBaseQuery()->getQuery();
    }

    protected function getConfig(): Configuration
    {
        return $this->config;
    }

    protected function getCacheFileBasePath(): string
    {
        return $this->cacheFileBasePath;
    }

    /**
     * @return QueryResult|null
     */
    protected abstract function getResultFromRow(array $row);

    protected abstract function getRowFromResult(QueryResult $result): array;

    protected abstract function shouldKeepRow(array $row): bool;

    protected function baseShouldKeepRow(
        array $row,
        int $timestampColumn,
        int $resultColumn,
        callable $parseKeyFromRow,
        callable $newRowKeyContainsKey
    ): bool {
        $rowTimestamp = (int)$row[$timestampColumn];
        $contentFileRelativePath = (string)$row[$resultColumn];
        $rowKey = $parseKeyFromRow($row);
        if ($rowTimestamp < $this->timeoutThresholdTimestamp) {
            // Row too old, ignore
            error_log(get_class($this) . ": trashing old row ($rowTimestamp < $this->timeoutThresholdTimestamp)");
            $ret = false;
        } elseif ($newRowKeyContainsKey($rowKey)) {
            // Cache row key is entirely contained by the new query key, ignore the cache row
            error_log(get_class($this) . ": trashing row with key contained by the new one:" . PHP_EOL . $rowKey);
            $ret = false;
        } elseif (!is_file($this->cacheFileBaseURL . $contentFileRelativePath)) {
            // Cached result is inexistent or not a regular file, ignore
            error_log(get_class($this) . ": trashing cached result '$contentFileRelativePath' because it does not exist in " . $this->cacheFileBaseURL);
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
            error_log("CachedQuery: cache hit for " . $this->baseQuery);
        } else {
            // Cache miss, send query
            error_log("CachedQuery: cache miss for " . $this->baseQuery);
            $result = $this->baseQuery->send();
            error_log("CachedQuery: received " . get_class($result));
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
