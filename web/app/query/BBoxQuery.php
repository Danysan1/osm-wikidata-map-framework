<?php

namespace App\Query;

require_once(__DIR__."/Query.php");
require_once(__DIR__."/../BoundingBox.php");

use \App\Query\Query;
use \App\BoundingBox;

/**
 * A query which takes a geographic bounding box and returns all the features in the requested area with the expected characteristics.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
interface BBoxQuery extends Query {
    /**
     * @return BoundingBox
     */
    public function getBBox();
}
