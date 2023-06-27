<?php

declare(strict_types=1);

namespace App\Query\PostGIS\Stats;

use App\BoundingBox;
use App\Config\Wikidata\WikidataConfig;
use App\ServerTiming;
use PDO;

class BBoxWikidataStatsPostGISQuery extends BBoxStatsPostGISQuery
{
    private string $foreignKeyField;
    private string $colorField;
    private string $descrField;

    public function __construct(
        string $foreignKeyField,
        string $colorField,
        string $descrField,
        BoundingBox $bbox,
        PDO $db,
        WikidataConfig $wikidataConfig,
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
            $wikidataConfig,
            $defaultLanguage,
            $language,
            $serverTiming,
            $maxElements,
            $source,
            $search
        );
        $this->foreignKeyField = $foreignKeyField;
        $this->colorField = $colorField;
        $this->descrField = $descrField;
    }

    public function getSqlQuery(): string
    {
        $filterClause = $this->getEtymologyFilterClause() . $this->getElementFilterClause();
        $foreignKeyField = $this->foreignKeyField;
        $colorField = $this->colorField;
        $descrField = $this->descrField;
        return
            "SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
                    'count', count,
                    'id', wd_wikidata_cod,
                    'descr', descr,
                    'color', color,
                    'name', wdt_name
                )), '[]'::JSON)
            FROM (
                SELECT
                    COUNT(DISTINCT wd.wd_id) AS count,
                    related.wd_wikidata_cod,
                    related.$descrField AS descr,
                    related.$colorField AS color,
                    related_text.wdt_name
                FROM owmf.element AS el
                JOIN owmf.etymology AS et ON et_el_id = el_id
                JOIN owmf.wikidata AS wd ON et_wd_id = wd.wd_id
                JOIN owmf.wikidata AS related ON wd.$foreignKeyField = related.wd_id
                LEFT JOIN owmf.wikidata_text AS related_text
                    ON related.wd_id = related_text.wdt_wd_id
                    AND related_text.wdt_language = COALESCE(:lang::VARCHAR,:defaultLang::VARCHAR)
                WHERE related_text.wdt_name IS NOT NULL
                $filterClause
                GROUP BY related.wd_id, related_text.wdt_name
                ORDER BY count DESC
            ) AS ele";
    }
}
