<?php

class QueryResult {
    /**
     * @var int
     */
    private $curlInfo;

    /**
     * @var string
     */
    private $body;

    /**
     * @param string $body
     * @param array $curlInfo
     * @see https://www.php.net/manual/en/function.curl-getinfo.php
     */
    public function __construct($body, $curlInfo) {
        $this->curlInfo = $curlInfo;
        $this->body = $body;
    }

    /**
     * @return int
     */
    public function getHttpCode() {
        return $this->curlInfo['http_code'];
    }

    /**
     * @return string
     */
    public function getBody() {
        return $this->body;
    }

    /**
     * @return boolean
     */
    public function success() {
        return $this->getHttpCode() == 200;
    }

    /**
     * @return boolean
     */
    public function isJSON() {
        $contentType = $this->curlInfo['content_type'];
        return strpos($this->contentType, 'application/json') !== false;
    }

    /**
     * @return boolean
     */
    public function isXML() {
        $contentType = $this->curlInfo['content_type'];
        return strpos($this->contentType, 'application/xml') !== false;
    }

    /**
     * @return array
     */
    public function parseJSONBody() {
        return json_decode($this->body, true);
    }

    /**
     * @return SimpleXMLElement
     */
    public function parseXMLBody() {
        return simplexml_load_string($this->body);
    }
}