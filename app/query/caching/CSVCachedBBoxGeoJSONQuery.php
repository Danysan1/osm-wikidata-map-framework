<?php

namespace App\Query\Caching;

require_once(__DIR__ . "/CSVCachedBBoxJSONQuery.php");
require_once(__DIR__ . "/../BBoxGeoJSONQuery.php");
require_once(__DIR__ . "/../../result/QueryResult.php");
require_once(__DIR__ . "/../../result/GeoJSONQueryResult.php");
require_once(__DIR__ . "/../../result/GeoJSONLocalQueryResult.php");

use \App\Query\Caching\CSVCachedBBoxJSONQuery;
use \App\Query\BBoxGeoJSONQuery;
use \App\Result\GeoJSONQueryResult;
use \App\Result\GeoJSONLocalQueryResult;
use \App\Result\QueryResult;
use \App\Configuration;
use \App\ServerTiming;

/**
 * A query which searches objects in a given bounding box caching the result in a file.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class CSVCachedBBoxGeoJSONQuery extends CSVCachedBBoxJSONQuery implements BBoxGeoJSONQuery
{
    /**
     * @param BBoxGeoJSONQuery $baseQuery
     * @param string $cacheFileBasePath
     * @param Configuration $config
     * @param ServerTiming|null $serverTiming
     */
    public function __construct($baseQuery, $cacheFileBasePath, $config, $serverTiming = null)
    {
        parent::__construct($baseQuery, $cacheFileBasePath, $config, $serverTiming);
        error_log("CSVCachedBBoxGeoJSONQuery base query: " . get_class($baseQuery));
    }

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
            error_log("CSVCachedBBoxGeoJSONQuery: Result is not a GeoJSONQueryResult but " . get_class($ret));
            throw new \Exception("Result is not a GeoJSONQueryResult");
        }
        return $ret;
    }
}
