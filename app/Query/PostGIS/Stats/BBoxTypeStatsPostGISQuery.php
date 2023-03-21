<?php

declare(strict_types=1);

namespace App\Query\PostGIS\Stats;

use BBoxStatsPostGISQuery;

class BBoxTypeStatsPostGISQuery extends BBoxStatsPostGISQuery
{
    public function getQuery(): string
    {
        $filterClause = $this->getEtymologyFilterClause() . $this->getElementFilterClause();
        return
            "SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
                    'count', count,
                    'id', wd_wikidata_cod,
                    'descr', wd_type_descr,
                    'color', wd_type_color,
                    'name', wdt_name
                )), '[]'::JSON)
            FROM (
                SELECT
                    COUNT(DISTINCT wd.wd_id) AS count,
                    instance.wd_wikidata_cod,
                    instance.wd_type_descr,
                    instance.wd_type_color,
                    instance_text.wdt_name
                FROM oem.element AS el
                JOIN oem.etymology AS et ON et_el_id = el_id
                JOIN oem.wikidata AS wd ON et_wd_id = wd.wd_id
                JOIN oem.wikidata AS instance ON wd.wd_instance_id = instance.wd_id
                LEFT JOIN oem.wikidata_text AS instance_text
                    ON instance.wd_id = instance_text.wdt_wd_id AND instance_text.wdt_language = :lang
                WHERE instance_text.wdt_name IS NOT NULL
                $filterClause
                GROUP BY instance.wd_id, instance_text.wdt_name
                ORDER BY count DESC
            ) AS ele";
    }
}
