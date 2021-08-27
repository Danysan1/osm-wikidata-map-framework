<?php

namespace App\Result;

require_once(__DIR__."/RemoteQueryResult.php");

use \App\Result\RemoteQueryResult;

/**
 * Base implementation of a remote query result.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
abstract class BaseRemoteQueryResult implements RemoteQueryResult
{
    /**
     * @var array
     */
    private $curlInfo;

    /**
     * @var string|null
     */
    private $body = null;

    /**
     * @param string|null $body
     * @param array $curlInfo
     * @see https://www.php.net/manual/en/function.curl-getinfo.php
     */
    public function __construct($body, $curlInfo)
    {
        $this->curlInfo = $curlInfo;
        $this->body = $body;
    }

    /**
     * @return boolean
     */
    public function hasBody()
    {
        return isset($this->body);
    }

    /**
     * @return string
     */
    public function getBody()
    {
        if (!isset($this->body)) {
            throw new \Exception('No data in body');
        }
        return $this->body;
    }

    /**
     * @return int
     */
    public function getHttpCode()
    {
        return (int)$this->curlInfo['http_code'];
    }

    public function isSuccessful(): bool
    {
        return $this->getHttpCode() >= 200 && $this->getHttpCode() < 300;
    }

    /**
     * @return string
     */
    public function getMimeType()
    {
        return (string)$this->curlInfo['content_type'];
    }

    /**
     * @return boolean
     */
    public function isJSON()
    {
        $contentType = $this->getMimeType();
        return strpos($contentType, 'application/json') !== false;
    }

    /**
     * @return boolean
     */
    public function isXML()
    {
        $contentType = $this->getMimeType();
        return
            strpos($contentType, 'application/xml') !== false ||
            strpos($contentType, 'text/xml') !== false ||
            strpos($contentType, 'application/sparql-results+xml') !== false;
    }

    public function __toString(): string
    {
        return "BaseRemoteQueryResult: " . json_encode($this->curlInfo) . PHP_EOL . $this->getBody();
    }
}
