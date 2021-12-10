<?php

namespace App\Query\PostGIS;

require_once(__DIR__ . "/BBoxPostGISQuery.php");
require_once(__DIR__ . "/../BBoxGeoJSONQuery.php");
require_once(__DIR__ . "/../../result/GeoJSONQueryResult.php");
require_once(__DIR__ . "/../../result/GeoJSONLocalQueryResult.php");

use \App\Query\BBoxGeoJSONQuery;
use \App\Query\PostGIS\BBoxPostGISQuery;
use \App\Result\GeoJSONQueryResult;
use \App\Result\GeoJSONLocalQueryResult;
use App\Result\QueryResult;

class BBoxEtymologyPostGISQuery extends BBoxPostGISQuery implements BBoxGeoJSONQuery
{
    /**
     * @return GeoJSONQueryResult
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
        return new GeoJSONLocalQueryResult(true, $stRes->fetchColumn());
    }

    public function getQuery(): string
    {
        return
            "SELECT JSON_BUILD_OBJECT(
                'type', 'FeatureCollection',
                'features', COALESCE(JSON_AGG(ST_AsGeoJSON(ele.*)::json), '[]'::JSON)
                )
            FROM (
                SELECT
                    el_geometry AS geom,
                    el_osm_type AS osm_type,
                    el_osm_id AS osm_id,
                    el_name AS name,
                    JSON_AGG(JSON_BUILD_OBJECT(
                        'birth_date', wd.wd_birth_date,
                        'birth_date_precision', wd.wd_birth_date_precision,
                        'birth_place', wdt.wdt_birth_place,
                        'citizenship', wdt.wdt_citizenship,
                        'commons', wd.wd_commons,
                        'death_date', wd.wd_death_date,
                        'death_date_precision', wd.wd_death_date_precision,
                        'death_place', wdt.wdt_death_place,
                        'description', wdt.wdt_description,
                        'end_date', wd.wd_end_date,
                        'end_date_precision', wd.wd_end_date_precision,
                        'event_date', wd.wd_event_date,
                        'event_date_precision', wd.wd_event_date_precision,
                        'event_place', wdt.wdt_event_place,
                        'gender', gender_text.wdt_name,
                        'genderID', 'http://www.wikidata.org/entity/'||gender.wd_wikidata_cod,
                        'instance', instance_text.wdt_name,
                        'instanceID', 'http://www.wikidata.org/entity/'||instance.wd_wikidata_cod,
                        'name', wdt.wdt_name,
                        'occupations', wdt.wdt_occupations,
                        'pictures', (SELECT JSON_AGG(wdp_picture) FROM wikidata_picture WHERE wdp_wd_id = wd.wd_id),
                        'prizes', wdt.wdt_prizes,
                        'start_date', wd.wd_start_date,
                        'start_date_precision', wd.wd_start_date_precision,
                        'wikidata', 'http://www.wikidata.org/entity/'||wd.wd_wikidata_cod,
                        'wikipedia', wdt.wdt_wikipedia_url,
                        'wkt_coords', ST_AsText(wd.wd_position)
                    )) AS etymologies
                FROM element
                JOIN etymology ON et_el_id = el_id
                JOIN wikidata AS wd ON et_wd_id = wd.wd_id
                LEFT JOIN wikidata_text AS wdt
                    ON wdt.wdt_wd_id = wd.wd_id AND wdt.wdt_language = :lang
                LEFT JOIN wikidata AS gender ON wd.wd_gender_id = gender.wd_id
                LEFT JOIN wikidata_text AS gender_text
                    ON gender.wd_id = gender_text.wdt_wd_id AND gender_text.wdt_language = :lang
                LEFT JOIN wikidata AS instance ON wd.wd_instance_id = instance.wd_id
                LEFT JOIN wikidata_text AS instance_text
                    ON instance.wd_id = instance_text.wdt_wd_id AND instance_text.wdt_language = :lang
                WHERE el_geometry @ ST_MakeEnvelope(:min_lon, :min_lat, :max_lon, :max_lat, 4326)
                GROUP BY el_id
            ) AS ele";
    }
}
