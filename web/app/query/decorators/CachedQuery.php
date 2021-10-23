<?php

namespace App\Query\Decorators;

require_once(__DIR__ . "/../../result/QueryResult.php");
require_once(__DIR__ . "/../Query.php");
require_once(__DIR__ . "/../../ServerTiming.php");
require_once(__DIR__ . "/../../Configuration.php");

use \App\ServerTiming;
use \App\Configuration;
use \App\Result\QueryResult;
use \App\Query\Query;

/**
 * A query which searches objects in a given bounding box caching the result in a file.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
abstract class CachedQuery implements Query
{
    /** @var string $cacheFileBasePath */
    private $cacheFileBasePath;

    /** @var Configuration $config */
    private $config;

    /** @var Query */
    private $baseQuery;

    /** @var ServerTiming|null $serverTiming */
    private $serverTiming;

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
    protected abstract function getResultFromRow(array $row, int $timeoutThresholdTimestamp);

    protected abstract function getRowFromResult(QueryResult $result): array;

    protected abstract function shouldKeepRow(array $row, int $timeoutThresholdTimestamp): bool;

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
        $className = str_replace("\\", "_", get_class($this->baseQuery));
        $cacheFilePath = $this->cacheFileBasePath . $className . "_cache.csv";
        $cacheFile = @fopen($cacheFilePath, "r");
        $cacheTimeoutHours = (int)$this->config->get('cache-timeout-hours');
        $timeoutThresholdTimestamp = time() - (60 * 60 * $cacheTimeoutHours);
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
                    $shouldKeep = $this->shouldKeepRow($row, $timeoutThresholdTimestamp);
                    if ($shouldKeep) {
                        $result = $this->getResultFromRow($row, $timeoutThresholdTimestamp);
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

        if ($result == null) {
            // Cache miss, send query
            error_log("CachedQuery: cache miss for " . $this->baseQuery);
            $result = $this->baseQuery->send();
            if ($this->serverTiming)
                $this->serverTiming->add("cache-missed-query");

            if ($result->isSuccessful()) {
                // Write the result to the cache file
                $newRow = $this->getRowFromResult($result);
                //error_log("CachedQuery: add new row for " . $this->getBBox());
                //error_log("CachedQuery new row: ".json_encode($newRow));
                array_unshift($newCache, $newRow);

                error_log("CachedQuery: save cache of " . count($newCache) . " rows");
                $cacheFile = @fopen($cacheFilePath, "w+");
                if (empty($cacheFile)) {
                    error_log("CachedQuery: failed to open cache file for writing");
                } else {
                    foreach ($newCache as $row) {
                        fputcsv($cacheFile, $row);
                    }
                    fclose($cacheFile);
                }
            } else {
                error_log("CachedQuery: unsuccessful request, discarding cache changes");
            }
            if ($this->serverTiming)
                $this->serverTiming->add("cache-write");
        }

        return $result;
    }

    public function __toString(): string
    {
        return get_class($this) . ", " . get_class($this->baseQuery) . ", " . $this->cacheFileBasePath;
    }
}
