<?php

declare(strict_types=1);

namespace App\Query\PostGIS\Stats;

class BBoxGenderStatsPostGISQuery extends BBoxStatsPostGISQuery
{
    public function getSqlQuery(): string
    {
        $filterClause = $this->getEtymologyFilterClause() . $this->getElementFilterClause();
        return
            "SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
                    'count', count,
                    'id', wd_wikidata_cod,
                    'descr', wd_gender_descr,
                    'color', wd_gender_color,
                    'name', wdt_name
                )), '[]'::JSON)
            FROM (
                SELECT
                    COUNT(DISTINCT wd.wd_id) AS count,
                    gender.wd_wikidata_cod,
                    gender.wd_gender_descr,
                    gender.wd_gender_color,
                    gender_text.wdt_name
                FROM oem.element AS el
                JOIN oem.etymology AS et ON et_el_id = el_id
                JOIN oem.wikidata AS wd ON et_wd_id = wd.wd_id
                JOIN oem.wikidata AS gender ON wd.wd_gender_id = gender.wd_id
                LEFT JOIN oem.wikidata_text AS gender_text
                    ON gender.wd_id = gender_text.wdt_wd_id
                    AND gender_text.wdt_language = COALESCE(:lang::VARCHAR,:defaultLang::VARCHAR)
                WHERE gender_text.wdt_name IS NOT NULL
                $filterClause
                GROUP BY gender.wd_id, gender_text.wdt_name
                ORDER BY count DESC
            ) AS ele";
    }
}
