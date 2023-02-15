<?php

declare(strict_types=1);

namespace App\Query\PostGIS;


use \PDO;
use \App\BoundingBox;
use \App\ServerTiming;
use \App\Query\BBoxQuery;
use \App\Query\PostGIS\PostGISQuery;
use InvalidArgumentException;

abstract class BBoxPostGISQuery extends PostGISQuery implements BBoxQuery
{
    private BoundingBox $bbox;
    private string $filterClause;

    public function __construct(
        BoundingBox $bbox,
        PDO $db,
        ?ServerTiming $serverTiming = null,
        ?string $source = null,
        ?string $subject = null
    ) {
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
        if (!empty($subject)) {
            if (preg_match('/^Q\d+$/', $subject) !== 1) //! regex match fundamental to prevent SQL injection
                throw new InvalidArgumentException("Bad subject: $subject");
            $this->filterClause .= " AND wd.wd_wikidata_cod = '$subject'";
        }
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
