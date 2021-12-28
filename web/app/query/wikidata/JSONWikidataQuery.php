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
     * @return QueryResult
     */
    protected function getResultFromCurlData($result, $curlInfo): QueryResult
    {
        return new JSONRemoteQueryResult($result, $curlInfo);
    }

    public function sendAndGetJSONResult(): JSONQueryResult
    {
        $out = $this->send();
        if (!$out instanceof JSONQueryResult)
            throw new \Exception("sendAndGetJSONResult(): can't get JSON result");
        return $out;
    }
}
