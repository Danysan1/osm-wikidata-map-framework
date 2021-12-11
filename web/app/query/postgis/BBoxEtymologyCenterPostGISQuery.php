<?php

namespace App\Query\PostGIS;

require_once(__DIR__ . "/BBoxPostGISQuery.php");
require_once(__DIR__ . "/../BBoxGeoJSONQuery.php");
require_once(__DIR__ . "/../../result/GeoJSONQueryResult.php");
require_once(__DIR__ . "/../../result/GeoJSONLocalQueryResult.php");

use \App\Query\BBoxGeoJSONQuery;
use \App\Query\PostGIS\BBoxPostGISQuery;
use \App\Result\GeoJSONQueryResult;
use \App\Result\GeoJSONLocalQueryResult;
use App\Result\QueryResult;

class BBoxEtymologyCenterPostGISQuery extends BBoxPostGISQuery implements BBoxGeoJSONQuery
{
    /**
     * @return GeoJSONQueryResult
     */
    public function send(): QueryResult
    {
        $stRes = $this->getDB()->prepare($this->getQuery());
        $stRes->execute([
            "min_lon" => $this->getBBox()->getMinLon(),
            "max_lon" => $this->getBBox()->getMaxLon(),
            "min_lat" => $this->getBBox()->getMinLat(),
            "max_lat" => $this->getBBox()->getMaxLat()
        ]);
        if ($this->getServerTiming() != null)
            $this->getServerTiming()->add("wikidata-query");
        return new GeoJSONLocalQueryResult(true, $stRes->fetchColumn());
    }

    public function getQuery(): string
    {
        return
        "SELECT JSON_BUILD_OBJECT(
            'type', 'FeatureCollection',
            'features', COALESCE(JSON_AGG(ST_AsGeoJSON(ele.*)::JSON), '[]'::JSON)
            )
        FROM (
            SELECT ST_Centroid(el_geometry) AS geom
            FROM element
            WHERE el_geometry @ ST_MakeEnvelope(:min_lon, :min_lat, :max_lon, :max_lat, 4326)
            AND el_id IN (SELECT et_el_id FROM etymology)
        ) as ele";
    }
}
