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
    private ?string $search;

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

        switch ($source) {
            case 'all':
                $filterClause = '';
                break;
            case 'osm_wikidata':
                $filterClause = 'AND et_from_osm_wikidata_wd_id IS NOT NULL AND et_recursion_depth = 0';
                break;
            case 'osm_propagated':
                $filterClause = 'AND et_recursion_depth != 0';
                break;
            default:
                if (!empty($availableSourceKeyIDs) && in_array($source, $availableSourceKeyIDs))
                    $filterClause = '';
                else
                    $filterClause = "AND et_from_$source AND et_recursion_depth = 0";
        }

        if (!empty($search))
            $filterClause .= " AND wd.wd_wikidata_cod = :search";

        $this->filterClause = $filterClause;
        $this->search = $search;
    }

    public function getBBox(): BoundingBox
    {
        return $this->bbox;
    }

    protected function getFilterClause(): string
    {
        return $this->filterClause;
    }

    protected function getSearch(): ?string
    {
        return $this->search;
    }

    public function __toString(): string
    {
        return parent::__toString() . ", " . $this->getBBox();
    }
}
