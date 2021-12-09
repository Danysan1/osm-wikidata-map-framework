<?php

namespace App\Query\PostGIS;

require_once(__DIR__ . "/../../BoundingBox.php");
require_once(__DIR__ . "/../../BaseStringSet.php");
require_once(__DIR__ . "/../../ServerTiming.php");
require_once(__DIR__ . "/../BBoxGeoJSONQuery.php");
require_once(__DIR__ . "/../wikidata/EtymologyIDListWikidataTextQuery.php");
require_once(__DIR__ . "/../../result/GeoJSONQueryResult.php");
require_once(__DIR__ . "/../../result/GeoJSONLocalQueryResult.php");

use \PDO;
use \App\BoundingBox;
use \App\BaseStringSet;
use \App\ServerTiming;
use \App\Query\BBoxGeoJSONQuery;
use \App\Query\Wikidata\EtymologyIDListWikidataTextQuery;
use \App\Result\GeoJSONQueryResult;
use \App\Result\GeoJSONLocalQueryResult;
use App\Result\QueryResult;

class BBoxEtymologyPostGISQuery implements BBoxGeoJSONQuery
{
    /**
     * @var BoundingBox $bbox
     */
    private $bbox;

    /**
     * @var string $language
     */
    private $language;

    /**
     * @var array $queryParams
     */
    private $queryParams;

    /**
     * @var string $wikidataEndpointURL
     */
    private $wikidataEndpointURL;

    /**
     * @var PDO $db
     */
    private $db;

    /**
     * @var ServerTiming|null $serverTiming
     */
    private $serverTiming;

    /**
     * @param BoundingBox $bbox
     * @param string $language
     * @param PDO $db
     * @param string $wikidataEndpointURL
     * @param ServerTiming|null $serverTiming
     */
    public function __construct($bbox, $language, $db, $wikidataEndpointURL, $serverTiming = null)
    {
        $this->bbox = $bbox;
        $this->language = $language;
        $this->db = $db;
        $this->wikidataEndpointURL = $wikidataEndpointURL;
        $this->serverTiming = $serverTiming;
        $this->queryParams = [
            "min_lon" => $bbox->getMinLon(),
            "max_lon" => $bbox->getMaxLon(),
            "min_lat" => $bbox->getMinLat(),
            "max_lat" => $bbox->getMaxLat(),
            "lang" => $language,
        ];
    }

    /**
     * @return GeoJSONQueryResult
     */
    public function send(): QueryResult
    {
        $stCheck = $this->db->prepare(
            "WITH
                wiki AS (
                    SELECT DISTINCT wd_id, wd_wikidata_cod, wd_gender_id, wd_instance_id
                    FROM etymology
                    JOIN wikidata ON et_wd_id = wd_id
                    JOIN element ON et_el_id = el_id
                    WHERE el_geometry @ ST_MakeEnvelope(:min_lon, :min_lat, :max_lon, :max_lat, 4326)
                ),
                available AS (
                    SELECT wdt_wd_id FROM wikidata_text WHERE wdt_language = :lang
                )
            SELECT wd_wikidata_cod FROM wiki WHERE wd_id NOT IN (SELECT wdt_wd_id FROM available)
            UNION
            SELECT gender.wd_wikidata_cod
            FROM wikidata AS gender
            JOIN wiki ON wiki.wd_gender_id = gender.wd_id
            WHERE gender.wd_id NOT IN (SELECT wdt_wd_id FROM available)
            UNION
            SELECT instance.wd_wikidata_cod
            FROM wikidata AS instance
            JOIN wiki ON wiki.wd_instance_id = instance.wd_id
            WHERE instance.wd_id NOT IN (SELECT wdt_wd_id FROM available)"
        );
        $stCheck->execute($this->queryParams);
        $missingWikidataText = $stCheck->fetchAll(PDO::FETCH_NUM);
        if (!empty($missingWikidataText)) {
            //error_log("missingWikidataText=" . json_encode($missingWikidataText));
            $searchArray = array_column($missingWikidataText,0);
            $searchSet = new BaseStringSet($searchArray);
            $wikidataQuery = new EtymologyIDListWikidataTextQuery(
                $searchSet,
                $this->language,
                $this->wikidataEndpointURL
            );
            $wikidataResult = $wikidataQuery->send();
            // TODO
        }

        $stRes = $this->db->prepare($this->getQuery());
        $stRes->execute($this->queryParams);
        return new GeoJSONLocalQueryResult(true, $stRes->fetchColumn());
    }

    public function getBBox(): BoundingBox
    {
        return $this->bbox;
    }

    public function getQuery(): string
    {
        return
            "SELECT JSON_BUILD_OBJECT(
                'type', 'FeatureCollection',
                'features', JSON_AGG(ST_AsGeoJSON(ele.*)::json)
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

    public function getQueryTypeCode(): string
    {
        return get_class($this);
    }

    public function __toString(): string
    {
        return $this->bbox . ", " . $this->language;
    }
}
