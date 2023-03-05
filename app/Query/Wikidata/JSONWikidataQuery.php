<?php

declare(strict_types=1);

namespace App\Query\Wikidata;

use App\Config\Wikidata\WikidataConfig;
use \App\Query\Wikidata\WikidataQuery;
use \App\Query\JSONQuery;
use \App\Result\JSONQueryResult;
use \App\Result\QueryResult;
use \App\Result\JSONRemoteQueryResult;

/**
 * Wikidata query sent via HTTP  request.
 */
class JSONWikidataQuery extends WikidataQuery implements JSONQuery
{
    public function __construct(string $query, WikidataConfig $config)
    {
        parent::__construct($query, "json", $config);
    }

    protected function getResultFromCurlData(?string $result, array $curlInfo): QueryResult
    {
        return new JSONRemoteQueryResult($result, $curlInfo);
    }

    public function sendAndGetJSONResult(): JSONQueryResult
    {
        $out = $this->send();
        if (!$out instanceof JSONQueryResult)
            throw new \Exception("sendAndGetJSONResult(): can't get JSON result");

        /*$classBaseName = (new \ReflectionClass($this))->getShortName();
        $jsonContent = $out->getJSON();
        @file_put_contents("$classBaseName.tmp.json", $jsonContent);*/

        return $out;
    }
}
