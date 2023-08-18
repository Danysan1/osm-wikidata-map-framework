<?php

declare(strict_types=1);

namespace App\Query\PostGIS;

use App\BoundingBox;
use App\Config\Wikidata\WikidataConfig;
use \App\Query\BBoxGeoJSONQuery;
use \App\Result\JSONQueryResult;
use \App\Result\GeoJSONQueryResult;
use App\ServerTiming;
use PDO;

class BBoxEtymologyPostGISQuery extends BBoxPostGISQuery implements BBoxGeoJSONQuery
{
    private ?string $textKey;
    private ?string $descriptionKey;
    private string $defaultLanguage;
    private ?string $language;
    private ?int $maxElements;

    public function __construct(
        BoundingBox $bbox,
        PDO $db,
        ?string $textKey,
        ?string $descriptionKey,
        string $defaultLanguage,
        ?string $language = null,
        ?ServerTiming $serverTiming = null,
        ?int $maxElements = null,
        ?string $source = null,
        ?string $search = null
    ) {
        parent::__construct(
            $bbox,
            $db,
            $serverTiming,
            $source,
            $search
        );
        $this->textKey = $textKey;
        $this->descriptionKey = $descriptionKey;
        $this->maxElements = $maxElements;
        $this->defaultLanguage = $defaultLanguage;
        $this->language = $language;
    }

    protected function getQueryParams(): array
    {
        $params = parent::getQueryParams();
        $params["defaultLang"] = $this->defaultLanguage;
        $params["lang"] = $this->language;
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
        $limitClause = $this->maxElements ? "LIMIT $this->maxElements" : "";
        $textEty = empty($this->textKey) ? "NULL" : "CASE WHEN el.el_has_text_etymology THEN el.el_tags ->> :textKey ELSE NULL END";
        $textEtyDescr = empty($this->descriptionKey) ? "NULL" : "CASE WHEN el.el_has_text_etymology THEN el.el_tags ->> :descriptionKey ELSE NULL END";

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
                    TRUE as from_osm,
                    FALSE as from_wikidata,
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
                    JSON_AGG(JSON_BUILD_OBJECT(
                        'et_id', et_id,
                        'from_osm', et_from_osm,
                        'from_osm_type', from_el.el_osm_type,
                        'from_osm_id', from_el.el_osm_id,
                        'from_wikidata', et_from_osm_wikidata_wd_id IS NOT NULL,
                        'from_wikidata_entity', from_wd.wd_wikidata_cod,
                        'from_wikidata_prop', et_from_osm_wikidata_prop_cod,
                        'from_parts_of_wikidata_cod', from_parts_of_wd.wd_wikidata_cod,
                        'propagated', et_recursion_depth != 0,
                        'wd_id', wd.wd_id,
                        'wikidata', wd.wd_wikidata_cod
                    )) AS etymologies,
                    COUNT(wd.wd_id) AS num_etymologies
                FROM owmf.element AS el
                LEFT JOIN owmf.etymology AS et ON et_el_id = el_id
                LEFT JOIN owmf.wikidata AS wd ON et_wd_id = wd.wd_id
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
