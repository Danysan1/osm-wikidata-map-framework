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
        return
            strpos($contentType, 'application/xml') !== false ||
            strpos($contentType, 'text/xml') !== false ||
            strpos($contentType, 'application/sparql-results+xml') !== false;
    }

    /**
     * @return array|null
     */
    public function parseJSONBody() {
        return empty($this->body) ? null : (array)json_decode($this->body, true);
    }

    /**
     * @return SimpleXMLElement
     */
    public function parseXMLBody() {
        if(empty($this->body) || !$this->isXML()) {
            throw new Exception('No XML body available');
        }

        $out = simplexml_load_string($this->body);
        if(!$out) {
            throw new Exception('Could not parse XML body');
        }

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