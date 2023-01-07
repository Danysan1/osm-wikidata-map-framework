<?php

namespace App\Query\PostGIS;

require_once(__DIR__ . "/../../BoundingBox.php");
require_once(__DIR__ . "/../../ServerTiming.php");
require_once(__DIR__ . "/../BBoxQuery.php");
require_once(__DIR__ . "/PostGISQuery.php");

use \PDO;
use \App\BoundingBox;
use \App\ServerTiming;
use \App\Query\BBoxQuery;
use \App\Query\PostGIS\PostGISQuery;

abstract class BBoxPostGISQuery extends PostGISQuery implements BBoxQuery
{
    private BoundingBox $bbox;
    private string $filterClause;

    public function __construct(BoundingBox $bbox, PDO $db, ?ServerTiming $serverTiming = null, ?string $source = null)
    {
        parent::__construct($db, $serverTiming);
        $this->bbox = $bbox;
        $this->filterClause = match ($source) {
            'etymology' => 'AND et_from_osm_etymology AND et_recursion_depth = 0',
            'subject' => 'AND et_from_osm_subject AND et_recursion_depth = 0',
            'buried' => 'AND et_from_osm_buried AND et_recursion_depth = 0',
            'wikidata' => 'AND et_from_wikidata_wd_id IS NOT NULL AND et_recursion_depth = 0',
            'propagated' => 'AND et_recursion_depth != 0',
            default => ''
        };
    }

    public function getBBox(): BoundingBox
    {
        return $this->bbox;
    }

    protected function getFilterClause(): string
    {
        return $this->filterClause;
    }

    public function __toString(): string
    {
        return parent::__toString() . ", " . $this->getBBox();
    }
}
