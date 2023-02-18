<?php

declare(strict_types=1);

namespace App\Query;


use \App\Query\JSONQuery;
use \App\Query\CurlQuery;
use \App\Result\JSONQueryResult;
use \App\Result\QueryResult;
use \App\Result\JSONRemoteQueryResult;

class JSONCurlQuery extends CurlQuery implements JSONQuery
{
    protected function getResultFromCurlData(?string $result, array $curlInfo): QueryResult
    {
        return new JSONRemoteQueryResult($result, $curlInfo);
    }

    public function sendAndGetJSONResult(): JSONQueryResult
    {
        $out = $this->send();
        if (!$out instanceof JSONQueryResult)
            throw new \Exception(get_class($this) . "::sendAndGetJSONResult(): can't get JSON result");
        return $out;
    }
}
