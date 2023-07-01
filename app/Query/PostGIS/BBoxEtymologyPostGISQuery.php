<?php

declare(strict_types=1);

namespace App\Query\PostGIS;

use App\BoundingBox;
use App\Config\Wikidata\WikidataConfig;
use \App\Query\BBoxGeoJSONQuery;
use \App\Query\PostGIS\BBoxTextPostGISQuery;
use \App\Result\JSONQueryResult;
use \App\Result\GeoJSONQueryResult;
use App\ServerTiming;
use PDO;

class BBoxEtymologyPostGISQuery extends BBoxTextPostGISQuery implements BBoxGeoJSONQuery
{
    private ?string $textKey;
    private ?string $descriptionKey;
    private bool $downloadColors;

    public function __construct(
        BoundingBox $bbox,
        PDO $db,
        WikidataConfig $wikidataConfig,
        ?string $textKey,
        ?string $descriptionKey,
        string $defaultLanguage,
        ?string $language = null,
        ?ServerTiming $serverTiming = null,
        ?int $maxElements = null,
        ?string $source = null,
        ?string $search = null,
        bool $downloadColors = false,
        bool $eagerFullDownload = false
    ) {
        parent::__construct(
            $bbox,
            $db,
            $wikidataConfig,
            $defaultLanguage,
            $language,
            $serverTiming,
            $maxElements,
            $source,
            $search,
            $downloadColors,
            $eagerFullDownload
        );
        $this->textKey = $textKey;
        $this->descriptionKey = $descriptionKey;
        $this->downloadColors = $downloadColors;
    }

    protected function getQueryParams(): array
    {
        $params = parent::getQueryParams();
        if (!empty($this->textKey))
            $params["textKey"] = $this->textKey;
        if (!empty($this->descriptionKey))
            $params["descriptionKey"] = $this->descriptionKey;
        return $params;
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

    public function getSqlQuery(): string
    {
        $filterClause = $this->getEtymologyFilterClause() . $this->getElementFilterClause();
        $limitClause = $this->getLimitClause();
        $textEty = empty($this->textKey) ? "NULL" : "CASE WHEN el.el_has_text_etymology THEN el.el_tags ->> :textKey ELSE NULL END";
        $textEtyDescr = empty($this->descriptionKey) ? "NULL" : "CASE WHEN el.el_has_text_etymology THEN el.el_tags ->> :descriptionKey ELSE NULL END";
        $colorColumns = $this->downloadColors ? "
            COALESCE(MIN(owmf.et_source_color(et)), '#223b53') AS source_color,
            COALESCE(MIN(gender.wd_gender_color), '#223b53') AS gender_color,
            COALESCE(MIN(instance.wd_type_color), '#223b53') AS type_color,
            COALESCE(MIN(country.wd_country_color), '#223b53') AS country_color,
            COALESCE(MIN(owmf.et_century_color(EXTRACT(CENTURY FROM COALESCE(wd.wd_start_date, wd.wd_birth_date, wd.wd_event_date)))), '#223b53') AS start_century_color,
            COALESCE(MIN(owmf.et_century_color(EXTRACT(CENTURY FROM COALESCE(wd.wd_end_date, wd.wd_death_date, wd.wd_event_date)))), '#223b53') AS end_century_color,
            " : "";
        return
            "SELECT JSON_BUILD_OBJECT(
                'type', 'FeatureCollection',
                'features', COALESCE(JSON_AGG(ST_AsGeoJSON(ele.*)::json), '[]'::JSON),
                'metadata', JSON_BUILD_OBJECT('etymology_count', COALESCE(SUM(ele.num_etymologies), 0))
                )
            FROM (
                SELECT
                    el.el_id,
                    el.el_geometry AS geom,
                    el.el_osm_type AS osm_type,
                    el.el_osm_id AS osm_id,
                    COALESCE(
                        el.el_tags->>CONCAT('name:',:lang::VARCHAR),
                        el.el_tags->>'name',
                        -- Usually the name in the main language is in name=*, not in name:<main_language>=*, so using name:<default_launguage>=* before name=* would often hide the name in the main language
                        el.el_tags->>CONCAT('name:',:defaultLang::VARCHAR)
                    ) AS name,
                    el.el_tags->>'alt_name' AS alt_name,
                    el.el_tags->>'official_name' AS official_name,
                    $textEty AS text_etymology,
                    $textEtyDescr AS text_etymology_descr,
                    el.el_commons AS commons,
                    el.el_wikidata_cod AS wikidata,
                    el.el_wikipedia AS wikipedia,
                    $colorColumns
                    JSON_AGG(JSON_BUILD_OBJECT(
                        'from_osm', et_from_osm,
                        'from_osm_type', from_el.el_osm_type,
                        'from_osm_id', from_el.el_osm_id,
                        'from_wikidata', FALSE,
                        'from_wikidata_entity', from_wd.wd_wikidata_cod,
                        'from_wikidata_prop', et_from_osm_wikidata_prop_cod,
                        'from_parts_of_wikidata_cod', from_parts_of_wd.wd_wikidata_cod,
                        'propagated', et_recursion_depth != 0,
                        'et_id', et_id,
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
                        'instanceID', instance.wd_wikidata_cod,
                        'name', wdt.wdt_name,
                        'occupations', wdt.wdt_occupations,
                        'pictures', (
                            SELECT JSON_AGG(JSON_BUILD_OBJECT(
                                'picture', wdp_picture,
                                'attribution', wdp_attribution
                            ))
                            FROM owmf.wikidata_picture
                            WHERE wdp_wd_id = wd.wd_id
                        ),
                        'prizes', wdt.wdt_prizes,
                        'start_date', EXTRACT(epoch FROM wd.wd_start_date),
                        'start_date_precision', wd.wd_start_date_precision,
                        'wikidata', wd.wd_wikidata_cod,
                        'wikipedia', wdt.wdt_wikipedia_url,
                        'wkt_coords', ST_AsText(wd.wd_position)
                    )) AS etymologies,
                    COUNT(wd.wd_id) AS num_etymologies
                FROM owmf.element AS el
                LEFT JOIN owmf.etymology AS et ON et_el_id = el_id
                LEFT JOIN owmf.wikidata AS wd ON et_wd_id = wd.wd_id
                LEFT JOIN owmf.wikidata_text AS wdt
                    ON wdt.wdt_wd_id = wd.wd_id AND wdt.wdt_language = :lang::VARCHAR
                LEFT JOIN owmf.wikidata AS gender ON wd.wd_gender_id = gender.wd_id
                LEFT JOIN owmf.wikidata_text AS gender_text
                    ON gender.wd_id = gender_text.wdt_wd_id AND gender_text.wdt_language = :lang::VARCHAR
                LEFT JOIN owmf.wikidata AS instance ON wd.wd_instance_id = instance.wd_id
                LEFT JOIN owmf.wikidata AS country ON wd.wd_country_id = country.wd_id
                LEFT JOIN owmf.wikidata AS from_wd ON from_wd.wd_id = et_from_osm_wikidata_wd_id
                LEFT JOIN owmf.wikidata AS from_parts_of_wd ON from_parts_of_wd.wd_id = et_from_parts_of_wd_id
                LEFT JOIN owmf.element AS from_el ON from_el.el_id = et_from_el_id
                WHERE (el.el_has_text_etymology OR wd.wd_id IS NOT NULL)
                $filterClause
                GROUP BY el.el_id
                $limitClause
            ) AS ele";
    }
}
