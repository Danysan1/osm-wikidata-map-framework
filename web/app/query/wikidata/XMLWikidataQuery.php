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
 */
class XMLWikidataQuery extends WikidataQuery implements XMLQuery
{
    public function __construct(string $query, string $endpointURL)
    {
        parent::__construct($query, "xml", $endpointURL);
    }

    /**
     * @param string|null $result
     * @param array $curlInfo
     * @return QueryResult
     */
    protected function getResultFromCurlData($result, $curlInfo): QueryResult
    {
        return new XMLRemoteQueryResult($result, $curlInfo);
    }

    public function sendAndGetXMLResult(): XMLQueryResult
    {
        $ret = $this->send();
        if (!$ret instanceof XMLQueryResult)
            throw new \Exception("sendAndGetXMLResult(): can't get XML result");

        /*$classBaseName = (new \ReflectionClass($this))->getShortName();
        $xmlContent = $ret->getXML();
        @file_put_contents("$classBaseName.tmp.json", $xmlContent);*/

        return $ret;
    }
}
