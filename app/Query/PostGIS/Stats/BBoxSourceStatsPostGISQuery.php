<?php

declare(strict_types=1);

namespace App\Query\PostGIS\Stats;


use \App\Query\BBoxJSONQuery;
use \App\Query\PostGIS\BBoxPostGISQuery;
use \App\Result\JSONQueryResult;
use \App\Result\JSONLocalQueryResult;
use \App\Result\QueryResult;

class BBoxSourceStatsPostGISQuery extends BBoxPostGISQuery implements BBoxJSONQuery
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
                'color', source_color,
                'name', source_name
            )), '[]'::JSON)
        FROM (
            SELECT
                COUNT(DISTINCT COALESCE(et_wd_id::VARCHAR, LOWER(el_tags->>'name'))) AS count,
                COALESCE(oem.et_source_color(et), '#223b53') AS source_color,
                COALESCE(oem.et_source_name(et), 'OpenStreetMap (text only)') AS source_name
            FROM oem.element AS el
            LEFT JOIN oem.etymology AS et ON et_el_id = el_id
            WHERE TRUE $filterClause
            GROUP BY source_color, source_name
            ORDER BY count DESC
        ) AS ele";
    }
}
