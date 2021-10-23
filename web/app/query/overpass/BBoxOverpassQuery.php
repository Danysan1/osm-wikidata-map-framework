<?php

namespace App\Query\Overpass;

require_once(__DIR__ . "/../../BoundingBox.php");
require_once(__DIR__ . "/../BBoxQuery.php");
require_once(__DIR__ . "/BaseOverpassQuery.php");
require_once(__DIR__ . "/OverpassConfig.php");

use \App\BoundingBox;
use \App\Query\BBoxQuery;
use \App\Query\Overpass\BaseOverpassQuery;
use \App\Query\Overpass\OverpassConfig;

/**
 * Overpass query which saves the detail of the bounding box.
 * 
 * @author Daniele Santini <daniele@dsantini.it>
 */
class BBoxOverpassQuery extends BaseOverpassQuery implements BBoxQuery
{
    private BoundingBox $bbox;

    private string $tag;

    /**
     * @param string $tag
     * @param BoundingBox $bbox
     * @param string $outputType
     * @param OverpassConfig $config
     */
    public function __construct($tag, $bbox, $outputType, $config)
    {
        parent::__construct(
            $tag,
            $bbox->asBBoxString(),
            $outputType,
            $config
        );
        $this->bbox = $bbox;
        $this->tag = $tag;
    }

    /**
     * @return BoundingBox
     */
    public function getBBox(): BoundingBox
    {
        return $this->bbox;
    }

    public function __toString(): string
    {
        return get_class($this) . ", " . $this->tag . " / " . $this->getBBox()->__toString();
    }
}
