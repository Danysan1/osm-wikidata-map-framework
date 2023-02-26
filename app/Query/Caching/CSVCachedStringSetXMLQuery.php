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
 * @author Daniele Santini <daniele@dsantini.it>
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

        $xml = $result->getXML();
        $hash = sha1($xml);
        $xmlRelativePath = $hash . ".xml";
        $xmlAbsolutePath = $this->cacheFileBasePath . $xmlRelativePath;
        $writtenBytes = @file_put_contents($xmlAbsolutePath, $xml);
        if (!$writtenBytes)
            error_log("Failed writing cache to $xmlAbsolutePath");

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
