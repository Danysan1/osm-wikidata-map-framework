<?php
require_once("./QueryResult.php");

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