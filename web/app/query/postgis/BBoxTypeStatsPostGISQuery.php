<?php

namespace App\Query\PostGIS;

require_once(__DIR__ . "/BBoxPostGISQuery.php");
require_once(__DIR__ . "/../BBoxJSONQuery.php");
require_once(__DIR__ . "/../../result/JSONQueryResult.php");
require_once(__DIR__ . "/../../result/JSONLocalQueryResult.php");

use \App\Query\BBoxJSONQuery;
use \App\Query\PostGIS\BBoxPostGISQuery;
use \App\Result\JSONQueryResult;
use \App\Result\JSONLocalQueryResult;
use App\Result\QueryResult;

class BBoxTypeStatsPostGISQuery extends BBoxPostGISQuery implements BBoxJSONQuery
{
    /**
     * @return JSONQueryResult
     */
    public function send(): QueryResult
    {
        $this->prepareSend();

        $stRes = $this->getDB()->prepare($this->getQuery());
        $stRes->execute([
            "min_lon" => $this->getBBox()->getMinLon(),
            "max_lon" => $this->getBBox()->getMaxLon(),
            "min_lat" => $this->getBBox()->getMinLat(),
            "max_lat" => $this->getBBox()->getMaxLat(),
            "lang" => $this->getLanguage(),
        ]);
        if ($this->getServerTiming() != null)
            $this->getServerTiming()->add("wikidata-query");
        return new JSONLocalQueryResult(true, $stRes->fetchColumn());
    }

    public function getQuery(): string
    {
        return
            "SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
                    'count', count,
                    'id', 'http://www.wikidata.org/entity/'||wd_wikidata_cod,
                    'name', wdt_name
                )), '[]'::JSON)
            FROM (
                SELECT COUNT(wd.wd_id) AS count, instance.wd_wikidata_cod, instance_text.wdt_name
                FROM element
                JOIN etymology ON et_el_id = el_id
                JOIN wikidata AS wd ON et_wd_id = wd.wd_id
                JOIN wikidata AS instance ON wd.wd_instance_id = instance.wd_id
                LEFT JOIN wikidata_text AS instance_text
                    ON instance.wd_id = instance_text.wdt_wd_id AND instance_text.wdt_language = :lang
                WHERE el_geometry @ ST_MakeEnvelope(:min_lon, :min_lat, :max_lon, :max_lat, 4326)
                GROUP BY instance.wd_id, instance_text.wdt_name
            ) AS ele";
    }
}
