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

    /**
     * @param array<string> $availableSourceKeyIDs Available source OSM wikidata keys in the DB
     */
    public function __construct(
        BoundingBox $bbox,
        PDO $db,
        ?ServerTiming $serverTiming = null,
        ?array $availableSourceKeyIDs = null,
        ?string $source = null,
        ?string $search = null
    ) {
        parent::__construct($db, $serverTiming);
        $this->bbox = $bbox;

        $filterClause = '';
        if ($source == 'wikidata') {
            $filterClause = 'AND et_from_wikidata_wd_id IS NOT NULL AND et_recursion_depth = 0';
        } elseif ($source == 'propagated') {
            $filterClause = 'AND et_recursion_depth != 0';
        } else {
            foreach ($availableSourceKeyIDs as $keyID) {
                if ($source == $keyID)
                    $filterClause = "AND et_from_$keyID AND et_recursion_depth = 0";
            }
        }

        if (!empty($search)) {
            if (preg_match('/^Q\d+$/', $search) !== 1) //! regex match fundamental to prevent SQL injection
                throw new InvalidArgumentException("Bad search: $search");
            $filterClause .= " AND wd.wd_wikidata_cod = '$search'";
        }
        $this->filterClause = $filterClause;
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
