<?php

class QueryResult {
    /**
     * @var array
     */
    private $curlInfo;

    /**
     * @var string|null
     */
    private $body;

    /**
     * @param string|null $body
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
        return (int)$this->curlInfo['http_code'];
    }

    /**
     * @return string|null
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
    public function hasData() {
        return !empty($this->getBody());
    }

    /**
     * @return boolean
     */
    public function isJSON() {
        $contentType = (string)$this->curlInfo['content_type'];
        return strpos($contentType, 'application/json') !== false;
    }

    /**
     * @return boolean
     */
    public function isXML() {
        $contentType = (string)$this->curlInfo['content_type'];
        return strpos($contentType, 'application/xml') !== false;
    }

    /**
     * @return array|null
     */
    public function parseJSONBody() {
        return empty($this->body) ? null : (array)json_decode($this->body, true);
    }

    /**
     * @return SimpleXMLElement|null
     */
    public function parseXMLBody() {
        if(empty($this->body)) {
            $out = null;
        } else {
            $out = simplexml_load_string($this->body);
            if(!$out)
                $out = null;
        }
        return $out;
    }
}