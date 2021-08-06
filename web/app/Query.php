<?php
require_once(__DIR__."/QueryResult.php");

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
interface Query {
    /**
     * @return string
     */
    public function getQuery();

    /**
     * @return QueryResult
     */
    public function send();
}