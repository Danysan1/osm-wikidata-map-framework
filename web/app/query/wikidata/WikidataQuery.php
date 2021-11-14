<?php

namespace App\Query\Wikidata;

require_once(__DIR__ . "/../BaseQuery.php");
require_once(__DIR__ . "/../../result/QueryResult.php");

use App\Query\BaseQuery;
use App\Result\QueryResult;

/**
 * Wikidata query sent via HTTP request.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
abstract class WikidataQuery extends BaseQuery
{
    /**
     * @var string $method The HTTP method to use.
     */
    private $method;

    /**
     * @param string $query
     * @return string $endpointURL
     * @param "GET"|"POST" $method
     */
    public function __construct(string $query, string $endpointURL, string $method = "POST")
    {
        parent::__construct($query, $endpointURL);
        $this->method = $method;
    }

    protected abstract function getRequestQuery(): string;

    /**
     * @param string|null $result
     * @param array $curlInfo
     * @return QueryResult
     */
    protected abstract function getResultFromCurlData($result, $curlInfo): QueryResult;

    public function send(): QueryResult
    {
        $ch = curl_init();
        $requestQuery = $this->getRequestQuery();
        $url = $this->getEndpointURL();
        if ($this->method == "GET")
            $url .= "?" . $requestQuery;
        $post = $this->method == "POST";
        $postData = $post ? $requestQuery : null;
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_POST => $post,
            CURLOPT_POSTFIELDS => $postData,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERAGENT => "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36",
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_SSL_VERIFYPEER => 0
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $result = curl_exec($ch);
        $curlInfo = (array)curl_getinfo($ch);
        curl_close($ch);
        if (!$result)
            $result = null;
        else
            assert(is_string($result));
        return $this->getResultFromCurlData($result, $curlInfo);
    }

    public function getMinifiedQuery(): string
    {
        $original = $this->getQuery();
        $minified = preg_replace('/(?:^\s+)|(?:\s*#[\/\s\w\(\),\']+$)/m', "", $original);
        if (empty($minified)) {
            error_log("getMinifiedQuery:" . PHP_EOL . $original . PHP_EOL . $minified);
            throw new \Exception("Query minimization led to an empty string");
        }
        return $minified;
    }
}
