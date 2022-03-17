<?php

namespace App\Query;

require_once(__DIR__ . "/BaseQuery.php");
require_once(__DIR__ . "/../result/QueryResult.php");

use App\Query\BaseQuery;
use App\Result\QueryResult;

abstract class CurlQuery extends BaseQuery
{
    private $curlOptions;

    public function __construct(array|string $query, string $endpointURL, ?string $method = "GET", ?string $userAgent = null)
    {
        $requestQuery = is_array($query) ? http_build_query($query) : urlencode($query);
        parent::__construct($requestQuery, $endpointURL);

        $url = $endpointURL;
        if ($method == "GET")
            $url .= "?" . $requestQuery;

        $post = $method == "POST";
        $postData = $post ? $requestQuery : null;
        /*error_log(
            get_class($this) . " CurlQuery : $method $url"
                . PHP_EOL . json_encode($query)
        );*/

        $this->curlOptions = [
            CURLOPT_URL => $url,
            CURLOPT_POST => $post,
            CURLOPT_POSTFIELDS => $postData,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERAGENT => $userAgent,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_SSL_VERIFYPEER => false,
        ];
    }

    /**
     * Function that transforms the output of cURL to a QueryResult
     * 
     * @param string|null $result
     * @param array $curlInfo
     * @return QueryResult
     */
    protected abstract function getResultFromCurlData(string $result, array $curlInfo): QueryResult;

    public function send(): QueryResult
    {
        $ch = \curl_init();
        \curl_setopt_array($ch, $this->curlOptions);
        $result = \curl_exec($ch);
        $curlInfo = (array)curl_getinfo($ch);
        \curl_close($ch);
        if (!$result)
            $result = null;
        else
            assert(is_string($result));
        return $this->getResultFromCurlData($result, $curlInfo);
    }
}
