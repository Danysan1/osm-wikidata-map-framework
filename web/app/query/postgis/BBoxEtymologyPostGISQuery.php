<?php

namespace App\Query\PostGIS;

require_once(__DIR__ . "/../../BoundingBox.php");
require_once(__DIR__ . "/../../ServerTiming.php");
require_once(__DIR__ . "/../BBoxGeoJSONQuery.php");
require_once(__DIR__ . "/../../result/GeoJSONQueryResult.php");
require_once(__DIR__ . "/../../result/GeoJSONLocalQueryResult.php");

use \App\BoundingBox;
use \App\ServerTiming;
use \App\Query\BBoxGeoJSONQuery;
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
     * @var ServerTiming|null $serverTiming
     */
    private $serverTiming;

    /**
     * @param BoundingBox $bbox
     * @param string $language
     * @param string $wikidataEndpointURL
     * @param ServerTiming|null $serverTiming
     */
    public function __construct($bbox, $language, $wikidataEndpointURL, $serverTiming = null)
    {
        $this->bbox = $bbox;
        $this->language = $language;
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
        throw new \Exception();
        return new GeoJSONLocalQueryResult(true, "{}");
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
                        'birth_date', wd_birth_date,
                        'birth_date_precision', wd_birth_date_precision,
                        'birth_place', wdt_birth_place,
                        'citizenship', wdt_citizenship,
                        'commons', wd_commons,
                        'death_date', wd_death_date,
                        'death_date_precision', wd_death_date_precision,
                        'death_place', wdt_death_place,
                        'description', wdt_description,
                        'end_date', wd_end_date,
                        'end_date_precision', wd_end_date_precision,
                        'event_date', wd_event_date,
                        'event_date_precision', wd_event_date_precision,
                        'event_place', wdt_event_place,
                        'gender', NULL, -- TODO
                        'genderID', 'http://www.wikidata.org/entity/'||wd_gender_id,
                        'instanceID', 'http://www.wikidata.org/entity/'||wd_instance_id,
                        'name', wdt_name,
                        'occupations', wdt_occupations,
                        'pictures', NULL, -- TODO
                        'prizes', wdt_prizes,
                        'start_date', wd_start_date,
                        'start_date_precision', wd_start_date_precision,
                        'wikidata', 'http://www.wikidata.org/entity/'||wd_wikidata_id,
                        'wikipedia', wdt_wikipedia,
                        'wkt_coords', ST_AsText(wd_position)
                    )) AS etymologies
                FROM element
                JOIN etymology ON et_el_id = el_id
                JOIN wikidata ON et_wd_id = wd_id
                LEFT JOIN wikidata_text ON wdt_wd_id = wd_id AND wdt_language = :lang
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
