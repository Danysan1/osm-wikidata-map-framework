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
 */
class BBoxOverpassQuery extends BaseOverpassQuery implements BBoxQuery
{
    /**
     * @var BoundingBox $bbox
     */
    private $bbox;

    /**
     * @param string|array<string> $tags
     * @param BoundingBox $bbox
     * @param string $outputType
     * @param OverpassConfig $config
     */
    public function __construct($tags, $bbox, $outputType, $config)
    {
        parent::__construct(
            $tags,
            $bbox->asBBoxString(),
            $outputType,
            $config
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
