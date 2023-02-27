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
    private ?string $source;

    public function __construct(
        BoundingBox $bbox,
        PDO $db,
        ?ServerTiming $serverTiming = null,
        ?string $source = null,
        ?string $search = null
    ) {
        parent::__construct($db, $serverTiming);
        $this->bbox = $bbox;

        $filterClause = "";
        if (!empty($source) && $source != "all") {
            $filterClause .= " AND :source = ANY(et.et_from_key_ids) ";
            $this->source = $source;
        } else {
            $this->source = null;
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

    protected function getSource(): ?string
    {
        return $this->source;
    }

    public function __toString(): string
    {
        return parent::__toString() . ", " . $this->getBBox();
    }
}
