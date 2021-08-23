<?php

namespace App\Query\Overpass;

require_once(__DIR__ . "/../../BoundingBox.php");
require_once(__DIR__ . "/../BBoxQuery.php");
require_once(__DIR__ . "/OverpassQuery.php");

use \App\BoundingBox;
use \App\Query\BBoxQuery;
use \App\Query\Overpass\OverpassQuery;

/**
 * Overpass query which saves the detail of the bounding box.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class BBoxOverpassQuery extends OverpassQuery implements BBoxQuery
{
    /**
     * @var BoundingBox
     */
    private $bbox;

    /**
     * @param BoundingBox $bbox
     * @param string $query
     * @param string $endpointURL
     */
    public function __construct($bbox, $query, $endpointURL)
    {
        parent::__construct($query, $endpointURL);
        $this->bbox = $bbox;
    }

    /**
     * @return BoundingBox
     */
    public function getBBox()
    {
        return $this->bbox;
    }
}
