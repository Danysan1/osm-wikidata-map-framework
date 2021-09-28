<?php

namespace App\Query\Overpass;

require_once(__DIR__ . "/../../BoundingBox.php");
require_once(__DIR__ . "/../BBoxQuery.php");
require_once(__DIR__ . "/BaseOverpassQuery.php");

use \App\BoundingBox;
use \App\Query\BBoxQuery;
use \App\Query\Overpass\BaseOverpassQuery;

/**
 * Overpass query which saves the detail of the bounding box.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class BBoxOverpassQuery extends BaseOverpassQuery implements BBoxQuery
{
    /**
     * @var BoundingBox
     */
    private $bbox;

    /**
     * @param string $tag
     * @param BoundingBox $bbox
     * @param string $outputType
     * @param string $endpointURL
     * @param boolean $nodes
     * @param boolean $ways
     * @param boolean $relations
     */
    public function __construct($tag, $bbox, $outputType, $endpointURL, $nodes, $ways, $relations)
    {
        parent::__construct(
            $tag,
            $bbox->asBBoxString(),
            $outputType,
            $endpointURL,
            $nodes,
            $ways,
            $relations
        );
        $this->bbox = $bbox;
    }

    /**
     * @return BoundingBox
     */
    public function getBBox(): BoundingBox
    {
        return $this->bbox;
    }
}
