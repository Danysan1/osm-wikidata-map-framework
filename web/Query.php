<?php
require_once("./QueryResult.php");

abstract class Query {
    /**
     * @var string
     */
    private $query;

    /**
     * @param string $query
     */
    public function __construct($query) {
        $this->query = $query;
    }
    
    /**
     * @return string
     */
    public function getQuery() {
        return $this->query;
    }

    /**
     * @param string $endpoint
     * @return QueryResult
     */
    public abstract function send($endpoint);
}