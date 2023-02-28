<?php

declare(strict_types=1);

namespace App\Query\PostGIS;


use \PDO;
use \App\BoundingBox;
use \App\ServerTiming;
use \App\Query\BBoxQuery;
use \App\Query\PostGIS\PostGISQuery;
use App\Result\GeoJSONLocalQueryResult;
use App\Result\QueryResult;

abstract class BBoxPostGISQuery extends PostGISQuery implements BBoxQuery
{
    private BoundingBox $bbox;
    private string $elementFilterClause;
    private string $etymologyFilterClause = "";
    private array $queryParams;

    public function __construct(
        BoundingBox $bbox,
        PDO $db,
        ?ServerTiming $serverTiming = null,
        ?string $source = null,
        ?string $search = null
    ) {
        parent::__construct($db, $serverTiming);
        $this->bbox = $bbox;

        $this->elementFilterClause = " AND el.el_geometry @ ST_MakeEnvelope(:min_lon, :min_lat, :max_lon, :max_lat, 4326)";
        $this->queryParams = [
            "min_lon" => $this->getBBox()->getMinLon(),
            "max_lon" => $this->getBBox()->getMaxLon(),
            "min_lat" => $this->getBBox()->getMinLat(),
            "max_lat" => $this->getBBox()->getMaxLat(),
        ];
        if (!empty($source) && $source != "all") {
            $this->etymologyFilterClause .= " AND :source = ANY(et.et_from_key_ids) ";
            $this->queryParams["source"] = $source;
        }
        if (!empty($search)) {
            $this->etymologyFilterClause .= " AND wd.wd_wikidata_cod = :search";
            $this->queryParams["search"] = $search;
        }
    }

    public function getBBox(): BoundingBox
    {
        return $this->bbox;
    }

    protected function getElementFilterClause(): string
    {
        return $this->elementFilterClause;
    }

    protected function getEtymologyFilterClause(): string
    {
        return $this->etymologyFilterClause;
    }

    protected function getQueryParams(): array
    {
        return $this->queryParams;
    }

    public function send(): QueryResult
    {
        $stRes = $this->getDB()->prepare($this->getQuery());
        $stRes->execute($this->getQueryParams());
        if ($this->hasServerTiming())
            $this->getServerTiming()->add("postgis-query");
        return new GeoJSONLocalQueryResult(true, $stRes->fetchColumn());
    }

    public function __toString(): string
    {
        return parent::__toString() . ", " . $this->getBBox();
    }
}
