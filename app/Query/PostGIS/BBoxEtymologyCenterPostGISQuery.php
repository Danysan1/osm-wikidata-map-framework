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
        $elementFilterClause = $this->getElementFilterClause();
        $etymologyFilterClause = $this->getetymologyFilterClause();
        return
            "SELECT JSON_BUILD_OBJECT(
            'type', 'FeatureCollection',
            'features', COALESCE(JSON_AGG(ST_AsGeoJSON(ele.*)::JSON), '[]'::JSON)
            )
        FROM (
            SELECT ST_Centroid(ST_Collect(el_geometry)) AS geom
            FROM oem.element AS el
            WHERE TRUE $elementFilterClause
            AND el_id IN (
                SELECT et_el_id
                FROM oem.etymology AS et
                JOIN oem.wikidata AS wd ON wd.wd_id = et.et_wd_id
                WHERE TRUE
                $etymologyFilterClause
            )
            GROUP BY ST_ReducePrecision(ST_Centroid(el_geometry), 0.1), LOWER(el_tags->>'name')
        ) as ele";
    }
}
