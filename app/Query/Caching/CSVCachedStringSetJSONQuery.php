<?php

declare(strict_types=1);

namespace App\Query\Caching;


use \App\Query\Caching\CSVCachedStringSetQuery;
use \App\Query\StringSetJSONQuery;
use \App\Result\JSONLocalQueryResult;
use \App\Result\JSONQueryResult;
use \App\Result\QueryResult;
use \App\ServerTiming;
use \App\Config\Configuration;

/**
 * A query which searches objects in a given string set caching the result in a file.
 * 
 * @psalm-suppress UnusedClass
 */
class CSVCachedStringSetJSONQuery extends CSVCachedStringSetQuery implements StringSetJSONQuery
{
    protected function getResultFromFile(string $relativePath): QueryResult
    {
        return new JSONLocalQueryResult(true, null, $this->cacheFileBaseURL . $relativePath);
    }

    protected function createFileFromResult(QueryResult $result): string
    {
        if (!$result instanceof JSONQueryResult) {
            throw new \Exception("Result is not a JSONQueryResult");
        }

        $jsonContent = $result->getJSON();
        $hash = sha1($jsonContent);
        $fileRelativePath = $hash . ".json";
        $fileAbsolutePath = $this->getCacheFileBasePath() . $fileRelativePath;
        $writtenBytes = @file_put_contents($fileAbsolutePath, $jsonContent);
        if (!$writtenBytes)
            error_log("Failed writing cache to $fileAbsolutePath");

        return $fileRelativePath;
    }

    public function sendAndGetJSONResult(): JSONQueryResult
    {
        $ret = $this->send();
        if (!$ret instanceof JSONQueryResult)
            throw new \Exception("sendAndGetJSONResult(): can't get JSON result");
        return $ret;
    }
}
