<?php

declare(strict_types=1);

namespace App\Query\PostGIS\Stats;

class BBoxEndCenturyStatsPostGISQuery extends BBoxStatsPostGISQuery
{
    public function getSqlQuery(): string
    {
        $filterClause = $this->getEtymologyFilterClause() . $this->getElementFilterClause();
        return
            "SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
                    'count', count,
                    'id', century,
                    'color', COALESCE(owmf.et_century_color(century), '#223b53'),
                    'name', COALESCE(century::VARCHAR, 'Other')
                )), '[]'::JSON)
            FROM (
                SELECT
                    COUNT(DISTINCT wd.wd_id) AS count,
                    --EXTRACT(CENTURY FROM COALESCE(wd_end_date, wd_death_date, wd_event_date)) AS century_name,
                    EXTRACT(CENTURY FROM COALESCE(wd_end_date, wd_death_date, wd_event_date)) AS century
                FROM owmf.element AS el
                JOIN owmf.etymology AS et ON et_el_id = el_id
                JOIN owmf.wikidata AS wd ON et_wd_id = wd.wd_id
                WHERE COALESCE(:lang::VARCHAR,:defaultLang::VARCHAR) IS NOT NULL -- TODO Refactor class structure to remove necessity to pass :lang
                AND COALESCE(wd_end_date, wd_death_date, wd_event_date) IS NOT NULL
                $filterClause
                GROUP BY century
                ORDER BY century DESC
            ) AS ele";
    }
}
