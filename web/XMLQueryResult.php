<?php
require_once("./QueryResult.php");

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
interface XMLQueryResult extends QueryResult {
    /**
     * @return SimpleXMLElement
     */
    public function getSimpleXMLElement();
}