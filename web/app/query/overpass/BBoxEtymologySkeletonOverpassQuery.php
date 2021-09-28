<?php

namespace App\Query\Overpass;

require_once(__DIR__ . "/../../BoundingBox.php");
require_once(__DIR__ . "/BBoxOverpassQuery.php");

use \App\BoundingBox;
use \App\Query\Overpass\BBoxOverpassQuery;

/**
 * OverpassQL query that retrieves only the skeleton and the id of any item in a bounding box which has an etymology.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class BBoxEtymologySkeletonOverpassQuery extends BBoxOverpassQuery
{
    /**
     * @param BoundingBox $bbox
     * @param string $endpointURL
     * @param boolean $nodes
     * @param boolean $ways
     * @param boolean $relations
     */
    public function __construct($bbox, $endpointURL, $nodes, $ways, $relations)
    {
        parent::__construct(
            'name:etymology:wikidata',
            $bbox,
            'out skel; >; out skel qt;',
            $endpointURL,
            $nodes,
            $ways,
            $relations
        );
    }
}
