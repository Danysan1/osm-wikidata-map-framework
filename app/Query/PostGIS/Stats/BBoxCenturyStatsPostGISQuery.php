<?php

declare(strict_types=1);

namespace App\Query\PostGIS\Stats;

class BBoxCenturyStatsPostGISQuery extends BBoxStatsPostGISQuery
{
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
                WHERE :lang = :lang -- TODO Refactor class structure to remove necessity to pass :lang
                AND COALESCE(wd_event_date, wd_start_date, wd_birth_date) IS NOT NULL
                $filterClause
                GROUP BY century
                ORDER BY century DESC
            ) AS ele";
    }
}
