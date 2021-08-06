<?php
require_once(__DIR__."/QueryResult.php");

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
interface RemoteQueryResult extends QueryResult {
    /**
     * @return boolean
     */
    public function hasBody();

    /**
     * @return string
     */
    public function getBody();

    /**
     * @return int
     */
    public function getHttpCode();

    /**
     * @return string
     */
    public function getMimeType();
}