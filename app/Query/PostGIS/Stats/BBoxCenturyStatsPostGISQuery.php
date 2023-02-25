<?php

declare(strict_types=1);

namespace App\Query\PostGIS\Stats;

use \App\Query\BBoxJSONQuery;
use App\Query\PostGIS\BBoxTextPostGISQuery;
use App\Result\JSONLocalQueryResult;
use App\Result\JSONQueryResult;
use App\Result\QueryResult;

class BBoxCenturyStatsPostGISQuery extends BBoxTextPostGISQuery implements BBoxJSONQuery
{
    public function send(): QueryResult
    {
        $this->downloadMissingText();

        $stRes = $this->getDB()->prepare($this->getQuery());
        $stRes->bindValue("min_lon", $this->getBBox()->getMinLon());
        $stRes->bindValue("max_lon", $this->getBBox()->getMaxLon());
        $stRes->bindValue("min_lat", $this->getBBox()->getMinLat());
        $stRes->bindValue("max_lat", $this->getBBox()->getMaxLat());
        if (!empty($this->getSearch()))
            $stRes->bindValue("search", $this->getSearch());
        $stRes->execute();
        if ($this->hasServerTiming())
            $this->getServerTiming()->add("stats-query");
        return new JSONLocalQueryResult(true, $stRes->fetchColumn());
    }

    public function sendAndGetJSONResult(): JSONQueryResult
    {
        $out = $this->send();
        if (!$out instanceof JSONQueryResult)
            throw new \Exception("sendAndGetJSONResult(): can't get JSON result");
        return $out;
    }

    public function getQuery(): string
    {
        $filterClause = $this->getFilterClause();
        return
            "SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
                    'count', count,
                    'id', century,
                    'color', COALESCE(oem.et_century_color(century), '#223b53'),
                    'name', COALESCE(century::VARCHAR, 'Other')
                )), '[]'::JSON)
            FROM (
                SELECT
                    COUNT(DISTINCT wd.wd_id) AS count,
                    --EXTRACT(CENTURY FROM COALESCE(wd_event_date, wd_start_date, wd_birth_date)) AS century_name,
                    EXTRACT(CENTURY FROM COALESCE(wd_event_date, wd_start_date, wd_birth_date)) AS century
                FROM oem.element
                JOIN oem.etymology ON et_el_id = el_id
                JOIN oem.wikidata AS wd ON et_wd_id = wd.wd_id
                WHERE el_geometry @ ST_MakeEnvelope(:min_lon, :min_lat, :max_lon, :max_lat, 4326)
                AND COALESCE(wd_event_date, wd_start_date, wd_birth_date) IS NOT NULL
                $filterClause
                GROUP BY century
                ORDER BY century DESC
            ) AS ele";
    }
}
