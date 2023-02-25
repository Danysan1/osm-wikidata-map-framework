<?php

declare(strict_types=1);

namespace App\Query\PostGIS;


use \App\Query\BBoxGeoJSONQuery;
use \App\Query\PostGIS\BBoxPostGISQuery;
use \App\Result\JSONQueryResult;
use \App\Result\GeoJSONQueryResult;
use \App\Result\GeoJSONLocalQueryResult;
use \App\Result\QueryResult;

class BBoxEtymologyCenterPostGISQuery extends BBoxPostGISQuery implements BBoxGeoJSONQuery
{
    public function send(): QueryResult
    {
        $stRes = $this->getDB()->prepare($this->getQuery());
        $stRes->bindValue("min_lon", $this->getBBox()->getMinLon());
        $stRes->bindValue("max_lon", $this->getBBox()->getMaxLon());
        $stRes->bindValue("min_lat", $this->getBBox()->getMinLat());
        $stRes->bindValue("max_lat", $this->getBBox()->getMaxLat());
        if (!empty($this->getSearch()))
            $stRes->bindValue("search", $this->getSearch());
        $stRes->execute();
        if ($this->hasServerTiming())
            $this->getServerTiming()->add("wikidata-query");
        return new GeoJSONLocalQueryResult(true, $stRes->fetchColumn());
    }

    public function sendAndGetJSONResult(): JSONQueryResult
    {
        $out = $this->send();
        if (!$out instanceof JSONQueryResult)
            throw new \Exception("sendAndGetJSONResult(): can't get JSON result");
        return $out;
    }

    public function sendAndGetGeoJSONResult(): GeoJSONQueryResult
    {
        $out = $this->send();
        if (!$out instanceof GeoJSONQueryResult)
            throw new \Exception("sendAndGetGeoJSONResult(): can't get GeoJSON result");
        return $out;
    }

    public function getQuery(): string
    {
        $filterClause = $this->getFilterClause();
        return
            "SELECT JSON_BUILD_OBJECT(
            'type', 'FeatureCollection',
            'features', COALESCE(JSON_AGG(ST_AsGeoJSON(ele.*)::JSON), '[]'::JSON)
            )
        FROM (
            SELECT ST_Centroid(ST_Collect(el_geometry)) AS geom
            FROM oem.element
            WHERE el_geometry @ ST_MakeEnvelope(:min_lon, :min_lat, :max_lon, :max_lat, 4326)
            AND el_id IN (
                SELECT et_el_id
                FROM oem.etymology AS et
                JOIN oem.wikidata AS wd ON wd.wd_id = et.et_wd_id
                WHERE TRUE
                $filterClause
            )
            GROUP BY ST_ReducePrecision(ST_Centroid(el_geometry), 0.1), LOWER(el_tags->>'name')
        ) as ele";
    }
}
