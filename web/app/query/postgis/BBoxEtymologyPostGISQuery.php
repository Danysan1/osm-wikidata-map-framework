<?php

namespace App\Query\PostGIS;

require_once(__DIR__ . "/BBoxTextPostGISQuery.php");
require_once(__DIR__ . "/../BBoxGeoJSONQuery.php");
require_once(__DIR__ . "/../../result/GeoJSONQueryResult.php");
require_once(__DIR__ . "/../../result/GeoJSONLocalQueryResult.php");

use \App\Query\BBoxGeoJSONQuery;
use \App\Query\PostGIS\BBoxTextPostGISQuery;
use \App\Result\JSONQueryResult;
use \App\Result\GeoJSONQueryResult;
use \App\Result\GeoJSONLocalQueryResult;
use App\Result\QueryResult;

class BBoxEtymologyPostGISQuery extends BBoxTextPostGISQuery implements BBoxGeoJSONQuery
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
            $this->getServerTiming()->add("etymology-query");
        return new GeoJSONLocalQueryResult(true, $stRes->fetchColumn());
    }

    public function sendAndGetJSONResult(): JSONQueryResult
    {
        $out = $this->send();
        if (!$out instanceof JSONQueryResult)
            throw new \Exception("sendAndGetJSONResult(): can't get JSON result");
        return $out;
    }

    public function sendAndGetGeoJSONResult(): GeoJSONQueryResult
    {
        $out = $this->send();
        if (!$out instanceof GeoJSONQueryResult)
            throw new \Exception("sendAndGetGeoJSONResult(): can't get GeoJSON result");
        return $out;
    }

    public function getQuery(): string
    {
        $limitClause = $this->getLimitClause();
        return
            "SELECT JSON_BUILD_OBJECT(
                'type', 'FeatureCollection',
                'features', COALESCE(JSON_AGG(ST_AsGeoJSON(ele.*)::json), '[]'::JSON)
                )
            FROM (
                SELECT
                    el.el_id,
                    el.el_geometry AS geom,
                    el.el_osm_type AS osm_type,
                    el.el_osm_id AS osm_id,
                    COALESCE(el.el_tags->>CONCAT('name:',:lang), el.el_tags->>'name') AS name,
                    el.el_text_etymology AS text_etymology,
                    el.el_commons AS commons,
                    el.el_wikipedia AS wikipedia,
                    MIN(gender.wd_gender_color) AS gender_color,
                    MIN(instance.wd_type_color) AS type_color,
                    JSON_AGG(JSON_BUILD_OBJECT(
                        'from_osm', et_from_osm,
                        'from_osm_type', from_el.el_osm_type,
                        'from_osm_id', from_el.el_osm_id,
                        'from_wikidata', et_from_wikidata,
                        'from_wikidata_cod', from_wd.wd_wikidata_cod,
                        'from_wikidata_prop', et_from_wikidata_prop_cod,
                        'wd_id', wd.wd_id,
                        'birth_date', EXTRACT(epoch FROM wd.wd_birth_date),
                        'birth_date_precision', wd.wd_birth_date_precision,
                        'birth_place', wdt.wdt_birth_place,
                        'citizenship', wdt.wdt_citizenship,
                        'commons', wd.wd_commons,
                        'death_date', EXTRACT(epoch FROM wd.wd_death_date),
                        'death_date_precision', wd.wd_death_date_precision,
                        'death_place', wdt.wdt_death_place,
                        'description', wdt.wdt_description,
                        'end_date', EXTRACT(epoch FROM wd.wd_end_date),
                        'end_date_precision', wd.wd_end_date_precision,
                        'event_date', EXTRACT(epoch FROM wd.wd_event_date),
                        'event_date_precision', wd.wd_event_date_precision,
                        'event_place', wdt.wdt_event_place,
                        'gender', gender_text.wdt_name,
                        'name', wdt.wdt_name,
                        'occupations', wdt.wdt_occupations,
                        'pictures', (
                            SELECT JSON_AGG(JSON_BUILD_OBJECT(
                                'picture', wdp_picture,
                                'attribution', wdp_attribution
                            ))
                            FROM oem.wikidata_picture
                            WHERE wdp_wd_id = wd.wd_id
                        ),
                        'prizes', wdt.wdt_prizes,
                        'start_date', EXTRACT(epoch FROM wd.wd_start_date),
                        'start_date_precision', wd.wd_start_date_precision,
                        'wikidata', wd.wd_wikidata_cod,
                        'wikipedia', wdt.wdt_wikipedia_url,
                        'wkt_coords', ST_AsText(wd.wd_position)
                    )) AS etymologies
                FROM oem.element AS el
                LEFT JOIN oem.etymology ON et_el_id = el_id
                LEFT JOIN oem.wikidata AS wd ON et_wd_id = wd.wd_id
                LEFT JOIN oem.wikidata_text AS wdt
                    ON wdt.wdt_wd_id = wd.wd_id AND wdt.wdt_language = :lang
                LEFT JOIN oem.wikidata AS gender ON wd.wd_gender_id = gender.wd_id
                LEFT JOIN oem.wikidata_text AS gender_text
                    ON gender.wd_id = gender_text.wdt_wd_id AND gender_text.wdt_language = :lang
                LEFT JOIN oem.wikidata AS instance ON wd.wd_instance_id = instance.wd_id
                LEFT JOIN oem.wikidata AS from_wd ON from_wd.wd_id = et_from_wikidata_wd_id
                LEFT JOIN oem.element AS from_el ON from_el.el_id = et_from_el_id
                WHERE (el.el_text_etymology IS NOT NULL OR wd.wd_id IS NOT NULL)
                AND el.el_geometry @ ST_MakeEnvelope(:min_lon, :min_lat, :max_lon, :max_lat, 4326)
                GROUP BY el.el_id
                $limitClause
            ) AS ele";
    }
}
