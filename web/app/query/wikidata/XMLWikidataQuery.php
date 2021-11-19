<?php

namespace App\Query\Wikidata;

require_once(__DIR__ . "/WikidataQuery.php");
require_once(__DIR__ . "/../XMLQuery.php");
require_once(__DIR__ . "/../../result/QueryResult.php");
require_once(__DIR__ . "/../../result/XMLQueryResult.php");
require_once(__DIR__ . "/../../result/XMLRemoteQueryResult.php");

use App\Query\Wikidata\WikidataQuery;
use App\Query\XMLQuery;
use App\Result\QueryResult;
use App\Result\XMLQueryResult;
use App\Result\XMLRemoteQueryResult;

/**
 * Wikidata query sent via HTTP  request.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class XMLWikidataQuery extends WikidataQuery implements XMLQuery
{
    protected function getRequestQuery(): string
    {
        return http_build_query(["format" => "xml", "query" => $this->getMinifiedQuery()]);
    }

    /**
     * @param string|null $result
     * @param array $curlInfo
     * @return XMLQueryResult
     */
    protected function getResultFromCurlData($result, $curlInfo): QueryResult
    {
        return new XMLRemoteQueryResult($result, $curlInfo);
    }

    /**
     * @return XMLQueryResult
     */
    public function send(): QueryResult
    {
        $ret = parent::send();
        if (!$ret instanceof XMLQueryResult)
            throw new \Exception("Invalid result type");
        return $ret;
    }
}
