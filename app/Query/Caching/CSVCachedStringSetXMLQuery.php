<?php

declare(strict_types=1);

namespace App\Query\Caching;


use \App\Query\Caching\CSVCachedStringSetQuery;
use \App\Query\StringSetXMLQuery;
use \App\Result\XMLLocalQueryResult;
use \App\Result\XMLQueryResult;
use \App\Result\QueryResult;
use \App\ServerTiming;
use \App\Config\Configuration;

/**
 * A query which searches objects in a given string set caching the result in a file.
 * 
 * @psalm-suppress UnusedClass
 */
class CSVCachedStringSetXMLQuery extends CSVCachedStringSetQuery implements StringSetXMLQuery
{
    protected function getResultFromFile(string $relativePath): QueryResult
    {
        return new XMLLocalQueryResult(true, null, $this->cacheFileBaseURL . $relativePath);
    }

    protected function createFileFromResult(QueryResult $result): string
    {
        if (!$result instanceof XMLQueryResult) {
            throw new \Exception("Result is not a XMLQueryResult");
        }

        $xmlContent = $result->getXML();
        $hash = sha1($xmlContent);
        $fileRelativePath = $hash . ".xml";
        $fileAbsolutePath = $this->getCacheFileBasePath() . $fileRelativePath;
        $writtenBytes = @file_put_contents($fileAbsolutePath, $xmlContent);
        if (!$writtenBytes)
            error_log("Failed writing cache to $fileAbsolutePath");

        return $fileRelativePath;
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
