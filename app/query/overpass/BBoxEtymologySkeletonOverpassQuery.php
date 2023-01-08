<?php

namespace App\Query\Overpass;

require_once(__DIR__ . "/../../BoundingBox.php");
require_once(__DIR__ . "/BBoxOverpassQuery.php");
require_once(__DIR__ . "/OverpassConfig.php");

use \App\BoundingBox;
use \App\Query\Overpass\BBoxOverpassQuery;
use \App\Query\Overpass\OverpassConfig;

/**
 * OverpassQL query that retrieves only the skeleton and the id of any item in a bounding box which has an etymology.
 */
class BBoxEtymologySkeletonOverpassQuery extends BBoxOverpassQuery
{
    /**
     * @param BoundingBox $bbox
     * @param OverpassConfig $config
     */
    public function __construct($bbox, $config)
    {
        parent::__construct(
            ['name:etymology:wikidata', 'subject:wikidata'],
            $bbox,
            'out skel; >; out skel qt;',
            $config
        );
    }
}
