<?php

declare(strict_types=1);

namespace App\Query\Overpass;


use \App\BoundingBox;
use \App\Query\BBoxQuery;
use \App\Query\Overpass\BaseOverpassQuery;
use \App\Query\Overpass\OverpassConfig;

/**
 * Overpass query which saves the detail of the bounding box.
 */
class BBoxOverpassQuery extends BaseOverpassQuery implements BBoxQuery
{
    private BoundingBox $bbox;

    public function __construct(string|array $tags, BoundingBox $bbox, string $outputType, OverpassConfig $config)
    {
        parent::__construct(
            $tags,
            $bbox->asBBoxString(),
            $outputType,
            $config
        );
        $this->bbox = $bbox;
    }

    public function getBBox(): BoundingBox
    {
        return $this->bbox;
    }
}
