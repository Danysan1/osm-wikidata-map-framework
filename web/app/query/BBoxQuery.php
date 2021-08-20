<?php

namespace App\Query;

require_once(__DIR__."/Query.php");

use \App\Query\Query;

/**
 * A query which takes a geographic bounding box and returns all the features in the requested area with the expected characteristics.
 * 
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
