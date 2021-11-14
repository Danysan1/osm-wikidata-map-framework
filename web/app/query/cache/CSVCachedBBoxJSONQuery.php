<?php

namespace App\Query\Cache;

require_once(__DIR__ . "/CSVCachedBBoxQuery.php");
require_once(__DIR__ . "/../BBoxJSONQuery.php");
require_once(__DIR__ . "/../../result/QueryResult.php");
require_once(__DIR__ . "/../../result/JSONQueryResult.php");
require_once(__DIR__ . "/../../result/JSONLocalQueryResult.php");

use \App\Query\Cache\CSVCachedBBoxQuery;
use \App\Query\BBoxJSONQuery;
use \App\Result\JSONQueryResult;
use \App\Result\JSONLocalQueryResult;
use \App\Result\QueryResult;

/**
 * A query which searches objects in a given bounding box caching the result in a file.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class CSVCachedBBoxJSONQuery extends CSVCachedBBoxQuery implements BBoxJSONQuery
{
    protected function getResultFromFilePath(string $fileRelativePath): QueryResult
    {
        return new JSONLocalQueryResult(true, null, $this->cacheFileBaseURL . $fileRelativePath);
    }

    protected function getRowDataFromResult(QueryResult $result): string
    {
        if (!$result instanceof JSONQueryResult) {
            throw new \Exception("Result is not a JSONQueryResult");
        }
        $json = $result->getJSON();
        return $json;
    }

    protected function getExtension(): string
    {
        return "json";
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
