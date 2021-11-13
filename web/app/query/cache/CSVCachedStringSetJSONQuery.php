<?php

namespace App\Query\Cache;

require_once(__DIR__ . "/CSVCachedStringSetQuery.php");
require_once(__DIR__ . "/../StringSetJSONQuery.php");
require_once(__DIR__ . "/../../result/QueryResult.php");
require_once(__DIR__ . "/../../result/JSONQueryResult.php");
require_once(__DIR__ . "/../../result/JSONLocalQueryResult.php");
require_once(__DIR__ . "/../../ServerTiming.php");
require_once(__DIR__ . "/../../Configuration.php");

use \App\Query\Cache\CSVCachedStringSetQuery;
use \App\Query\StringSetJSONQuery;
use \App\Result\JSONLocalQueryResult;
use App\Result\JSONQueryResult;
use App\Result\QueryResult;
use \App\ServerTiming;
use \App\Configuration;

/**
 * A query which searches objects in a given string set caching the result in a file.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class CSVCachedStringSetJSONQuery extends CSVCachedStringSetQuery implements StringSetJSONQuery
{
    /**
     * @param StringSetJSONQuery $baseQuery
     * @param string $cacheFileBasePath
     * @param Configuration $config
     * @param ServerTiming|null $serverTiming
     */
    public function __construct($baseQuery, $cacheFileBasePath, $config, $serverTiming = null)
    {
        parent::__construct($baseQuery, $cacheFileBasePath, $config, $serverTiming);
    }

    protected function getResultFromFile(string $relativePath): QueryResult
    {
        return new JSONLocalQueryResult(true, null, $this->cacheFileBaseURL . $relativePath);
    }

    protected function createFileFromResult(QueryResult $result): string
    {
        if (!$result instanceof JSONQueryResult) {
            throw new \Exception("Result is not a JSONQueryResult");
        }

        $xml = $result->getJSON();
        $hash = sha1($xml);
        $xmlRelativePath = $hash . ".xml";
        $xmlAbsolutePath = (string)$this->getConfig()->get("cache-file-base-path") . $xmlRelativePath;
        file_put_contents($xmlAbsolutePath, $xml);

        return $xmlRelativePath;
    }

    /**
     * @return JSONQueryResult
     */
    public function send(): QueryResult
    {
        $ret = parent::send();
        if (!$ret instanceof JSONQueryResult) {
            throw new \Exception("Internal error: Result is not a JSONQueryResult");
        }
        return $ret;
    }
}
