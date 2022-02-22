<?php

namespace App\Query\Overpass;

require_once(__DIR__ . "/../JSONCurlQuery.php");
require_once(__DIR__ . "/../../result/QueryResult.php");
require_once(__DIR__ . "/../../result/JSONRemoteQueryResult.php");

use \App\Query\JSONCurlQuery;
use \App\Result\QueryResult;
use \App\Result\RemoteQueryResult;
use \App\Result\JSONRemoteQueryResult;
use Error;
use Exception;

/**
 * Overpass query.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class OverpassQuery extends JSONCurlQuery
{
    public function __construct(string $query, string $endpointURL)
    {
        parent::__construct($query, $endpointURL, "POST");
    }

    protected function sendAndRequireResult(): QueryResult
    {
        $res = $this->send();
        if (!$res->isSuccessful()) {
            error_log("OverpassQuery failed: " . $this->getEndpointURL() . " / " . get_class($res));
            if ($res instanceof RemoteQueryResult && $res->hasBody()) {
                if (strpos($res->getBody(), "Dispatcher_Client::request_read_and_idx::timeout")) {
                    throw new Exception("Overpass server timeout. Please try later.");
                } elseif (strpos($res->getBody(), "Dispatcher_Client::request_read_and_idx::rate_limited")) {
                    throw new Exception("Rate limited by Overpass server. Please try later.");
                }
            } else {
                //error_log("OverpassQuery failed: $res");
                throw new \Exception("Overpass query failed");
            }
        } elseif (!$res->hasResult()) {
            throw new \Exception("Overpass query has no result");
        } elseif (empty($res->getResult())) {
            throw new \Exception("Overpass query has empty result");
        } elseif ($res instanceof JSONRemoteQueryResult && !empty($res->getArray()["remark"])) {
            $remark = (string)$res->getArray()["remark"];
            if (strpos($remark, "Query timed out") !== false) {
                throw new \Exception("Overpass query timed out. Please try with a smaller area.");
            } else {
                error_log($this->getEndpointURL() . " / JSONRemoteQueryResult remark: $remark");
            }
        } else {
            //error_log("sendAndRequireResult: result is of type " . gettype($res));
            //if ($res instanceof RemoteQueryResult) error_log("sendAndRequireResult: " . $res->getBody());
        }
        return $res;
    }
}
