<?php

namespace App\Query\Cache;

require_once(__DIR__ . "/CSVCachedBBoxJSONQuery.php");
require_once(__DIR__ . "/../BBoxGeoJSONQuery.php");
require_once(__DIR__ . "/../../result/QueryResult.php");
require_once(__DIR__ . "/../../result/GeoJSONQueryResult.php");
require_once(__DIR__ . "/../../result/GeoJSONLocalQueryResult.php");

use \App\Query\Cache\CSVCachedBBoxJSONQuery;
use \App\Query\BBoxGeoJSONQuery;
use \App\Result\GeoJSONQueryResult;
use \App\Result\GeoJSONLocalQueryResult;
use \App\Result\QueryResult;

/**
 * A query which searches objects in a given bounding box caching the result in a file.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class CSVCachedBBoxGeoJSONQuery extends CSVCachedBBoxJSONQuery implements BBoxGeoJSONQuery
{
    protected function getResultFromFilePath(string $fileRelativePath): QueryResult
    {
        return new GeoJSONLocalQueryResult(true, null, $this->cacheFileBaseURL . $fileRelativePath);
    }

    protected function getRowDataFromResult(QueryResult $result): string
    {
        if (!$result instanceof GeoJSONQueryResult) {
            throw new \Exception("Result is not a GeoJSONQueryResult");
        }
        $json = $result->getGeoJSON();
        if (strpos($json, 'features') == false || strpos($json, '"features":[]') != false) {
            error_log(
                get_class($this) . ": not saving JSON with no features"
                    //. PHP_EOL . "From " . $result
                    . PHP_EOL . "From " . $this->getBaseQuery()
            );
            throw new \Exception("Result is empty");
        }
        return $json;
    }

    protected function getExtension(): string
    {
        return "geojson";
    }

    public function sendAndGetGeoJSONResult(): GeoJSONQueryResult
    {
        $ret = $this->send();
        if (!$ret instanceof GeoJSONQueryResult) {
            throw new \Exception("Internal error: Result is not a GeoJSONQueryResult");
        }
        return $ret;
    }
}
