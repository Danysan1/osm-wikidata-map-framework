<?php

namespace App\Query\Wikidata;

require_once(__DIR__ . "/WikidataQuery.php");
require_once(__DIR__ . "/../JSONQuery.php");
require_once(__DIR__ . "/../../result/QueryResult.php");
require_once(__DIR__ . "/../../result/JSONRemoteQueryResult.php");

use App\Query\Wikidata\WikidataQuery;
use App\Query\JSONQuery;
use App\Result\JSONQueryResult;
use App\Result\QueryResult;
use App\Result\JSONRemoteQueryResult;

/**
 * Wikidata query sent via HTTP  request.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class JSONWikidataQuery extends WikidataQuery implements JSONQuery
{
    protected function getRequestQuery(): string
    {
        return http_build_query(["format" => "json", "query" => $this->getMinifiedQuery()]);
    }

    /**
     * @param string|null $result
     * @param array $curlInfo
     * @return JSONQueryResult
     */
    protected function getResultFromCurlData($result, $curlInfo): QueryResult
    {
        return new JSONRemoteQueryResult($result, $curlInfo);
    }

    /**
     * @return JSONQueryResult
     */
    public function send(): QueryResult
    {
        $ret = parent::send();
        if (!$ret instanceof JSONQueryResult)
            throw new \Exception("Invalid result type");
        return $ret;
    }
}
