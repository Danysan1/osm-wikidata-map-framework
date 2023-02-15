<?php

declare(strict_types=1);

namespace App\Query;


use \App\Query\Query;
use \App\BoundingBox;

/**
 * A query which takes a geographic bounding box and returns all the features in the requested area with the expected characteristics.
 */
interface BBoxQuery extends Query {
    /**
     * @return BoundingBox
     */
    public function getBBox(): BoundingBox;
}
