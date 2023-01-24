<?php

namespace App\Query\Caching;

require_once(__DIR__ . "/CSVCachedStringSetQuery.php");
require_once(__DIR__ . "/../StringSetXMLQuery.php");
require_once(__DIR__ . "/../../result/QueryResult.php");
require_once(__DIR__ . "/../../result/XMLQueryResult.php");
require_once(__DIR__ . "/../../result/XMLLocalQueryResult.php");
require_once(__DIR__ . "/../../ServerTiming.php");
require_once(__DIR__ . "/../../Configuration.php");

use \App\Query\Caching\CSVCachedStringSetQuery;
use \App\Query\StringSetXMLQuery;
use \App\Result\XMLLocalQueryResult;
use App\Result\XMLQueryResult;
use App\Result\QueryResult;
use \App\ServerTiming;
use \App\Configuration;

/**
 * A query which searches objects in a given string set caching the result in a file.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class CSVCachedStringSetXMLQuery extends CSVCachedStringSetQuery implements StringSetXMLQuery
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

    protected function getResultFromFile(string $relativePath): QueryResult
    {
        return new XMLLocalQueryResult(true, null, $this->cacheFileBaseURL . $relativePath);
    }

    protected function createFileFromResult(QueryResult $result): string
    {
        if (!$result instanceof XMLQueryResult) {
            throw new \Exception("Result is not a XMLQueryResult");
        }

        $xml = $result->getXML();
        $hash = sha1($xml);
        $xmlRelativePath = $hash . ".xml";
        $xmlAbsolutePath = (string)$this->getConfig()->get("cache_file_base_path") . $xmlRelativePath;
        file_put_contents($xmlAbsolutePath, $xml);

        return $xmlRelativePath;
    }

    public function sendAndGetXMLResult(): XMLQueryResult
    {
        $ret = $this->send();
        if (!$ret instanceof XMLQueryResult) {
            throw new \Exception("Internal error: Result is not a XMLQueryResult");
        }
        return $ret;
    }
}
