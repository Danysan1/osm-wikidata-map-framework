<?php

declare(strict_types=1);

namespace App\Query\Overpass;


use \App\Query\JSONCurlQuery;
use \App\Result\RemoteQueryResult;
use \App\Result\JSONRemoteQueryResult;
use App\Result\Overpass\OverpassQueryResult;
use Exception;

/**
 * Overpass query.
 */
class OverpassQuery extends JSONCurlQuery
{
    public function __construct(string $query, string $endpointURL)
    {
        parent::__construct(["data" => $query], $endpointURL, "POST");
    }

    public function sendAndRequireResult(): OverpassQueryResult
    {
        $res = $this->send();
        $endpointUrl = $this->getEndpointURL();
        if (!$res->isSuccessful()) {
            error_log("OverpassQuery from '$endpointUrl' failed: " . get_class($res));
            if (!$res instanceof RemoteQueryResult || !$res->hasBody())
                throw new Exception("Overpass query failed");

            if (strpos($res->getBody(), "Dispatcher_Client::request_read_and_idx::timeout"))
                throw new Exception("Overpass server timeout. Please try later.");

            if (strpos($res->getBody(), "Dispatcher_Client::request_read_and_idx::rate_limited"))
                throw new Exception("Rate limited by Overpass server. Please try later.");
        } elseif (!$res->hasResult()) {
            throw new Exception("Overpass query has no result");
        } elseif (empty($res->getResult())) {
            throw new Exception("Overpass query has empty result");
        } elseif ($res instanceof JSONRemoteQueryResult && !empty($res->getArray()["remark"])) {
            $remark = (string)$res->getArray()["remark"];
            if (strpos($remark, "Query timed out") !== false)
                throw new Exception("Overpass query timed out. Please try with a smaller area.");

            error_log("JSONRemoteQueryResult from '$endpointUrl' has a remark: '$remark'");
        } else {
            //error_log("sendAndRequireResult: result is of type " . gettype($res));
            //if ($res instanceof RemoteQueryResult) error_log("sendAndRequireResult: " . $res->getBody());
        }
        return new OverpassQueryResult($res->isSuccessful(), $res->getArray());
    }
}
