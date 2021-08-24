<?php

namespace App\Query\Overpass;

require_once(__DIR__ . "/../BaseQuery.php");
require_once(__DIR__ . "/../../result/QueryResult.php");
require_once(__DIR__ . "/../../result/JSONRemoteQueryResult.php");

use \App\Query\BaseQuery;
use \App\Result\QueryResult;
use \App\Result\JSONRemoteQueryResult;
use Exception;

/**
 * Overpass query.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class OverpassQuery extends BaseQuery
{
    /**
     * @return QueryResult
     */
    public function send(): QueryResult
    {
        return $this->_send();
    }

    private function _send(): QueryResult
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $this->getEndpointURL());
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $this->getQuery());
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $result = curl_exec($ch);
        $curlInfo = (array)curl_getinfo($ch);
        curl_close($ch);
        if (!$result)
            $result = null;
        else
            assert(is_string($result));
        return new JSONRemoteQueryResult($result, $curlInfo);
    }

    protected function sendAndRequireResult(): QueryResult
    {
        $res = $this->_send();
        if (!$res->isSuccessful()) {
            if ($res->hasResult()) {
                if (strpos($res->getResult(), "Dispatcher_Client::request_read_and_idx::timeout")) {
                    throw new Exception("Overpass server timeout. Please try later.");
                } elseif (strpos($res->getResult(), "Dispatcher_Client::request_read_and_idx::rate_limited")) {
                    throw new Exception("Rate limited by Overpass server. Please try later.");
                }
            } else {
                error_log("OverpassQuery: Overpass query failed: $res");
                throw new \Exception("Overpass query failed");
            }
        } elseif (!$res->hasResult()) {
            throw new \Exception("Overpass query has no result");
        } else {
            //error_log("OverpassQuery: result is of type " . gettype($res));
        }
        return $res;
    }
}
