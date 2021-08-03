<?php
require_once("./QueryResult.php");

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
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