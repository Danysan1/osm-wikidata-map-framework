<?php

declare(strict_types=1);

namespace App\Query\PostGIS\Stats;


use \App\Query\BBoxJSONQuery;
use \App\Query\PostGIS\BBoxTextPostGISQuery;
use \App\Result\JSONQueryResult;
use \App\Result\JSONLocalQueryResult;
use \App\Result\QueryResult;

class BBoxGenderStatsPostGISQuery extends BBoxTextPostGISQuery implements BBoxJSONQuery
{
    public function send(): QueryResult
    {
        $this->downloadMissingText();

        $stRes = $this->getDB()->prepare($this->getQuery());
        $stRes->execute([
            "min_lon" => $this->getBBox()->getMinLon(),
            "max_lon" => $this->getBBox()->getMaxLon(),
            "min_lat" => $this->getBBox()->getMinLat(),
            "max_lat" => $this->getBBox()->getMaxLat(),
            "lang" => $this->getLanguage(),
        ]);
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
                FROM oem.element
                JOIN oem.etymology ON et_el_id = el_id
                JOIN oem.wikidata AS wd ON et_wd_id = wd.wd_id
                JOIN oem.wikidata AS gender ON wd.wd_gender_id = gender.wd_id
                LEFT JOIN oem.wikidata_text AS gender_text
                    ON gender.wd_id = gender_text.wdt_wd_id AND gender_text.wdt_language = :lang
                WHERE el_geometry @ ST_MakeEnvelope(:min_lon, :min_lat, :max_lon, :max_lat, 4326)
                AND gender_text.wdt_name IS NOT NULL
                $filterClause
                GROUP BY gender.wd_id, gender_text.wdt_name
                ORDER BY count DESC
            ) AS ele";
    }
}
