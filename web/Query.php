<?php
require_once("./QueryResult.php");

interface Query {
    /**
     * @return string
     */
    public function getQuery();

    /**
     * @param string $endpoint
     * @return QueryResult
     */
    public function send($endpoint);
}