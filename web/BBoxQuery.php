<?php
require_once("./Query.php");

/**
 * @author Daniele Santini <daniele@dsantini.it>
 */
interface BBoxQuery extends Query {
    /**
     * @return float
     */
    public function getMinLat();

    /**
     * @return float
     */
    public function getMinLon();

    /**
     * @return float
     */
    public function getMaxLat();

    /**
     * @return float
     */
    public function getMaxLon();
}
