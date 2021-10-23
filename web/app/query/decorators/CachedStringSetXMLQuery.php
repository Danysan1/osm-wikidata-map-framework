<?php

namespace App\Query\Decorators;

require_once(__DIR__ . "/CachedQuery.php");
require_once(__DIR__ . "/../StringSetXMLQuery.php");
require_once(__DIR__ . "/../../result/QueryResult.php");
require_once(__DIR__ . "/../../result/XMLQueryResult.php");
require_once(__DIR__ . "/../../result/XMLLocalQueryResult.php");
require_once(__DIR__ . "/../../BaseStringSet.php");
require_once(__DIR__ . "/../../StringSet.php");
require_once(__DIR__ . "/../../ServerTiming.php");
require_once(__DIR__ . "/../../Configuration.php");

use \App\Query\Decorators\CachedQuery;
use \App\Query\StringSetXMLQuery;
use \App\Result\XMLLocalQueryResult;
use \App\BaseStringSet;
use App\Result\XMLQueryResult;
use App\Result\QueryResult;
use \App\StringSet;
use \App\ServerTiming;
use \App\Configuration;

define("STRING_SET_CACHE_COLUMN_TIMESTAMP", 0);
define("STRING_SET_CACHE_COLUMN_SET", 1);
define("STRING_SET_CACHE_COLUMN_RESULT", 2);

/**
 * A query which searches objects in a given bounding box caching the result in a file.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class CachedStringSetXMLQuery extends CachedQuery implements StringSetXMLQuery
{
    /**
     * @param StringSetXMLQuery $baseQuery
     * @param string $cacheFileBasePath
     * @param Configuration $config
     * @param ServerTiming|null $serverTiming
     */
    public function __construct($baseQuery, $cacheFileBasePath, $config, $serverTiming = null)
    {
        parent::__construct($baseQuery, $cacheFileBasePath, $config, $serverTiming);
    }

    public function getStringSet(): StringSet
    {
        $baseQuery = $this->getBaseQuery();
        if (!$baseQuery instanceof StringSetXMLQuery) {
            throw new \Exception("Base query is not a StringSetXMLQuery");
        }
        return $baseQuery->getStringSet();
    }

    protected function shouldKeepRow(array $row, int $timeoutThresholdTimestamp): bool
    {
        $rowTimestamp = (int)$row[STRING_SET_CACHE_COLUMN_TIMESTAMP];
        if ($rowTimestamp < $timeoutThresholdTimestamp) {
            // Row too old, ignore
            error_log("CachedStringSetXMLQuery: trashing old row ($rowTimestamp < $timeoutThresholdTimestamp)");
            $ret = false;
        } elseif ($this->getStringSet()->strictlyContains($this->getStringSetFromRow($row))) {
            // Cache row string set is entirely contained by the new query string set, ignore the cache row
            error_log("CachedStringSetXMLQuery: trashing string subset row");
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
        if ($this->getStringSetFromRow($row)->containsOrEquals($this->getStringSet())) {
            // Row string set contains entirely the query string set, cache hit!
            $cachedResult = (string)$row[STRING_SET_CACHE_COLUMN_RESULT];
            $result = new XMLLocalQueryResult(true, null, $cachedResult);
            //error_log("CachedStringSetXMLQuery: " . $rowStringSet . " contains " . $this->getStringSet());
            error_log("CachedStringSetXMLQuery: cache hit for " . $this->getStringSet());
        } else {
            //error_log("CachedStringSetXMLQuery: " . $rowStringSet . " does not contain " . $this->getStringSet());
            $result = null;
        }
        return $result;
    }

    protected function getRowFromResult(QueryResult $result): array
    {
        if (!$result instanceof XMLQueryResult) {
            throw new \Exception("Result is not a XMLQueryResult");
        }
        
        $xml = $result->getXML();
        $hash = sha1($xml);
        $xmlRelativePath = $hash . ".xml";
        $xmlAbsolutePath = (string)$this->getConfig()->get("cache-file-base-path") . $xmlRelativePath;
        file_put_contents($xmlAbsolutePath, $xml);

        $newRow = [
            STRING_SET_CACHE_COLUMN_TIMESTAMP => time(),
            STRING_SET_CACHE_COLUMN_SET => $this->getStringSet()->toJson(),
            STRING_SET_CACHE_COLUMN_RESULT => $xmlRelativePath
        ];
        return $newRow;
    }

    private function getStringSetFromRow(array $row): StringSet
    {
        return BaseStringSet::fromJSON((string)$row[STRING_SET_CACHE_COLUMN_SET]);
    }
}
