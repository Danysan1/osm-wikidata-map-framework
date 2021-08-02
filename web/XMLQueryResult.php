<?php
require_once("./QueryResult.php");

interface XMLQueryResult extends QueryResult {
    /**
     * @return SimpleXMLElement
     */
    public function getSimpleXMLElement();
}