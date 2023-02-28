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
    public function sendAndGetJSONResult(): JSONQueryResult
    {
        $out = $this->send();
        if (!$out instanceof JSONQueryResult)
            throw new \Exception("sendAndGetJSONResult(): can't get JSON result");
        return $out;
    }

    public function getQuery(): string
    {
        $filterClause = $this->getEtymologyFilterClause() . $this->getElementFilterClause();
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
                FROM oem.element AS el
                JOIN oem.etymology AS et ON et_el_id = el_id
                JOIN oem.wikidata AS wd ON et_wd_id = wd.wd_id
                WHERE el_geometry @ ST_MakeEnvelope(:min_lon, :min_lat, :max_lon, :max_lat, 4326)
                AND COALESCE(wd_event_date, wd_start_date, wd_birth_date) IS NOT NULL
                $filterClause
                GROUP BY century
                ORDER BY century DESC
            ) AS ele";
    }
}
