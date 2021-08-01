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
     * @return string
     */
    public function getBody() {
        if($this->body == null) {
            throw new Exception('No body available');
        }
        return $this->body;
    }

    /**
     * @return array
     * @see https://www.php.net/manual/en/function.curl-getinfo.php
     */
    public function getCurlInfo() {
        return $this->curlInfo;
    }

    /**
     * @return boolean
     */
    public function isSuccessful() {
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
        return
            strpos($contentType, 'application/xml') !== false ||
            strpos($contentType, 'text/xml') !== false ||
            strpos($contentType, 'application/sparql-results+xml') !== false;
    }

    /**
     * @return array|null
     */
    public function parseJSONBody() {
        if(empty($this->body)) {
            throw new Exception("QueryResult::parseJSONBody: No response available, can't parse");
        }
        if(!$this->isJSON()) {
            throw new Exception("QueryResult::parseJSONBody: Not a valid JSON response, can't parse");
        }

        return (array)json_decode($this->body, true);
    }

    /**
     * @return SimpleXMLElement
     */
    public function parseXMLBody() {
        if(empty($this->body)) {
            throw new Exception("QueryResult::parseXMLBody: No response available, can't parse");
        }
        if(!$this->isXML()) {
            throw new Exception("QueryResult::parseXMLBody: Not a valid JSON response, can't parse");
        }

        $out = simplexml_load_string($this->body);
        if(!$out) {
            throw new Exception('Could not parse XML body');
        }
        //error_log($out->saveXML());

        return $out;
    }

    /**
     * @return array
     * @psalm-suppress MixedReturnStatement
     */
    public function parseXMLBodyToObject() {
        $obj = json_decode(json_encode($this->parseXMLBody()), true);

        if ($obj===NULL || $obj===FALSE) {
            throw new Exception('Could not convert XML body');
        } else {
            assert(is_array($obj));
        }

        return $obj;
    }

    /**
     * @param string $message
     * @return void
     */
    public function errorLogResponse($message) {
        error_log(
            ($message ? $message.PHP_EOL : "")
            .json_encode($this->curlInfo).PHP_EOL
            .$this->getBody()
        );
    }
}