<?php

namespace App\Query\PostGIS\Stats;

require_once(__DIR__ . "/../BBoxTextPostGISQuery.php");
require_once(__DIR__ . "/../../BBoxJSONQuery.php");
require_once(__DIR__ . "/../../../result/JSONQueryResult.php");
require_once(__DIR__ . "/../../../result/JSONLocalQueryResult.php");

use \App\Query\BBoxJSONQuery;
use \App\Query\PostGIS\BBoxTextPostGISQuery;
use \App\Result\JSONQueryResult;
use \App\Result\JSONLocalQueryResult;
use App\Result\QueryResult;

class BBoxTypeStatsPostGISQuery extends BBoxTextPostGISQuery implements BBoxJSONQuery
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
                FROM oem.element
                JOIN oem.etymology ON et_el_id = el_id
                JOIN oem.wikidata AS wd ON et_wd_id = wd.wd_id
                JOIN oem.wikidata AS instance ON wd.wd_instance_id = instance.wd_id
                LEFT JOIN oem.wikidata_text AS instance_text
                    ON instance.wd_id = instance_text.wdt_wd_id AND instance_text.wdt_language = :lang
                WHERE el_geometry @ ST_MakeEnvelope(:min_lon, :min_lat, :max_lon, :max_lat, 4326)
                AND instance_text.wdt_name IS NOT NULL
                GROUP BY instance.wd_id, instance_text.wdt_name
                ORDER BY count DESC
            ) AS ele";
    }
}
