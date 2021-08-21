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
     */
    public function __construct($bbox, $endpointURL)
    {
        $bboxString = $bbox->asBBoxString();
        parent::__construct(
            $bbox,
            "[out:json][timeout:25];
            (
                //node['name:etymology:wikidata']($bboxString);
                way['name:etymology:wikidata']($bboxString);
                //relation['name:etymology:wikidata']($bboxString);
            );
            out skel;
            >;
            out skel qt;",
            $endpointURL
        );
    }
}
