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

    /**
     * @param array<string> $keys OSM wikidata keys to use
     */
    public function __construct(array $keys, BoundingBox $bbox, string $outputType, OverpassConfig $config)
    {
        parent::__construct(
            $keys,
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
