<?php

declare(strict_types=1);

namespace App\Query\PostGIS;


use App\StringSet;
use \PDO;
use \App\BoundingBox;
use \App\BaseStringSet;
use App\Config\Wikidata\WikidataConfig;
use \App\ServerTiming;
use \App\Query\PostGIS\BBoxPostGISQuery;
use App\Query\Wikidata\StringSetJSONWikidataQuery;
use App\Query\Wikidata\QueryBuilder\BaseEtymologyIDListWikidataQueryBuilder;
use App\Query\Wikidata\QueryBuilder\FullEtymologyIDListWikidataQueryBuilder;
use App\Result\QueryResult;
use App\Result\RemoteQueryResult;
use Exception;

abstract class BBoxTextPostGISQuery extends BBoxPostGISQuery
{
    private string $defaultLanguage;
    private ?string $language;
    private WikidataConfig $wikidataConfig;
    private ?int $maxElements;
    private bool $eagerFullDownload;

    public function __construct(
        BoundingBox $bbox,
        PDO $db,
        WikidataConfig $wikidataConfig,
        string $defaultLanguage,
        ?string $language = null,
        ?ServerTiming $serverTiming = null,
        ?int $maxElements = null,
        ?string $source = null,
        ?string $search = null,
        bool $eagerFullDownload = false
    ) {
        parent::__construct($bbox, $db, $serverTiming, $source, $search);

        if ($maxElements !== null && $maxElements <= 0) {
            throw new Exception("maxElements must be > 0");
        }

        $this->defaultLanguage = $defaultLanguage;
        $this->language = $language;
        $this->wikidataConfig = $wikidataConfig;
        $this->maxElements = $maxElements;
        $this->eagerFullDownload = $eagerFullDownload;
    }

    protected function getLimitClause(): string
    {
        return $this->maxElements === null ? ' ' : " LIMIT $this->maxElements ";
    }

    protected function getQueryParams(): array
    {
        $params = parent::getQueryParams();
        $params["defaultLang"] = $this->defaultLanguage;
        $params["lang"] = $this->language;
        return $params;
    }

    public function send(): QueryResult
    {
        if ($this->eagerFullDownload)
            $this->downloadMissingTextIfNecessary();
        return parent::send();
    }

    private function downloadMissingTextIfNecessary(): void
    {
        $downloadDateField = $this->eagerFullDownload ? "wd_full_download_date" : "wd_download_date";
        $filterClause = $this->getEtymologyFilterClause() . $this->getElementFilterClause();
        $maxIDs = $this->wikidataConfig->getMaxWikidataElements();
        $limitClause = $maxIDs > 0 ? " LIMIT $maxIDs " : " ";
        $language = empty($this->language) ? $this->defaultLanguage : $this->language;

        $queryParams = parent::getQueryParams();
        $queryParams["lang"] = $language;

        $sthMissingWikidata = $this->getDB()->prepare(
            "SELECT DISTINCT wd.wd_wikidata_cod
            FROM owmf.element AS el
            JOIN owmf.etymology AS et ON et.et_el_id = el.el_id
            JOIN owmf.wikidata AS wd ON et.et_wd_id = wd.wd_id
            LEFT JOIN owmf.wikidata_text AS wdt
                ON wdt.wdt_wd_id = wd.wd_id AND wdt.wdt_language = :lang::VARCHAR
            WHERE (wd.$downloadDateField IS NULL OR wdt.wdt_full_download_date IS NULL)
            $filterClause
            $limitClause"
        );
        $sthMissingWikidata->execute($queryParams);
        if ($this->hasServerTiming())
            $this->getServerTiming()->add("missing-wikidata-query");

        $missingWikidataText = $sthMissingWikidata->fetchAll(PDO::FETCH_NUM);
        if (!empty($missingWikidataText)) {
            //error_log("missingWikidataText=" . json_encode($missingWikidataText));
            /**
             * @var string[] $searchArray
             */
            $searchArray = array_column($missingWikidataText, 0);
            $searchSet = new BaseStringSet($searchArray);
            $this->downloadMissingText($searchSet, $language, $downloadDateField);
        }
    }

    private function downloadMissingText(StringSet $searchSet, string $language, string $downloadDateField): void
    {
        $queryBuilder = $this->eagerFullDownload ? new FullEtymologyIDListWikidataQueryBuilder() : new BaseEtymologyIDListWikidataQueryBuilder();
        $wikidataQuery = new StringSetJSONWikidataQuery(
            $searchSet,
            $language,
            $queryBuilder->createQuery($searchSet, $language),
            $this->wikidataConfig
        );
        $wikidataResult = $wikidataQuery->sendAndGetJSONResult();
        if ($this->hasServerTiming())
            $this->getServerTiming()->add("wikidata-text-download");

        if (!$wikidataResult->isSuccessful()) {
            if ($wikidataResult instanceof RemoteQueryResult)
                error_log("Wikidata bad response: " . $wikidataResult->getBody());
            throw new Exception("Wikidata request failed");
        }

        $responseJSON = $wikidataResult->getJSON();
        //file_put_contents("wikidata.json", $responseJSON);

        $stInsertGender = $this->getDB()->prepare(
            "INSERT INTO owmf.wikidata (wd_wikidata_cod)
            SELECT DISTINCT REPLACE(value->'genderID'->>'value', 'http://www.wikidata.org/entity/', '')
            FROM json_array_elements((:result::JSON)->'results'->'bindings')
            LEFT JOIN owmf.wikidata ON wd_wikidata_cod = REPLACE(value->'genderID'->>'value', 'http://www.wikidata.org/entity/', '')
            WHERE LEFT(value->'genderID'->>'value', 31) = 'http://www.wikidata.org/entity/'
            AND wikidata IS NULL
            UNION
            SELECT DISTINCT REPLACE(value->'instanceID'->>'value', 'http://www.wikidata.org/entity/', '')
            FROM json_array_elements((:result::JSON)->'results'->'bindings')
            LEFT JOIN owmf.wikidata ON wd_wikidata_cod = REPLACE(value->'instanceID'->>'value', 'http://www.wikidata.org/entity/', '')
            WHERE LEFT(value->'instanceID'->>'value', 31) = 'http://www.wikidata.org/entity/'
            AND wikidata IS NULL
            UNION
            SELECT DISTINCT REPLACE(value->'countryID'->>'value', 'http://www.wikidata.org/entity/', '')
            FROM json_array_elements((:result::JSON)->'results'->'bindings')
            LEFT JOIN owmf.wikidata ON wd_wikidata_cod = REPLACE(value->'countryID'->>'value', 'http://www.wikidata.org/entity/', '')
            WHERE LEFT(value->'countryID'->>'value', 31) = 'http://www.wikidata.org/entity/'
            AND wikidata IS NULL
            ON CONFLICT (wd_wikidata_cod) DO NOTHING"
        );
        $stInsertGender->bindValue("result", $responseJSON, PDO::PARAM_LOB);
        //$stInsertGender->debugDumpParams();
        $stInsertGender->execute();
        if ($this->hasServerTiming())
            $this->getServerTiming()->add("wikidata-insert-gender");

        $stInsertGenderText = $this->getDB()->prepare(
            "INSERT INTO owmf.wikidata_text (wdt_wd_id, wdt_language, wdt_name)
            WITH gender AS (
                    SELECT DISTINCT
                        value->'gender'->>'value' AS text,
                        REPLACE(value->'genderID'->>'value', 'http://www.wikidata.org/entity/', '') AS cod
                    FROM json_array_elements((:result::JSON)->'results'->'bindings') AS res
                ),
                instance AS (
                    SELECT DISTINCT
                        value->'instance'->>'value' AS text,
                        REPLACE(value->'instanceID'->>'value', 'http://www.wikidata.org/entity/', '') AS cod
                    FROM json_array_elements((:result::JSON)->'results'->'bindings') AS res
                ),
                country AS (
                    SELECT DISTINCT
                        value->'country'->>'value' AS text,
                        REPLACE(value->'countryID'->>'value', 'http://www.wikidata.org/entity/', '') AS cod
                    FROM json_array_elements((:result::JSON)->'results'->'bindings') AS res
                )
            SELECT DISTINCT wd.wd_id, :lang::VARCHAR, gender.text
            FROM gender
            JOIN owmf.wikidata AS wd ON wd.wd_wikidata_cod = gender.cod
            LEFT JOIN owmf.wikidata_text AS wdt
                ON wdt.wdt_wd_id = wd.wd_id AND wdt.wdt_language = :lang::VARCHAR
            WHERE wdt IS NULL
            UNION
            SELECT DISTINCT wd.wd_id, :lang::VARCHAR, instance.text
            FROM instance
            JOIN owmf.wikidata AS wd ON wd.wd_wikidata_cod = instance.cod
            LEFT JOIN owmf.wikidata_text AS wdt
                ON wdt.wdt_wd_id = wd.wd_id AND wdt.wdt_language = :lang::VARCHAR
            WHERE wdt IS NULL
            UNION
            SELECT DISTINCT wd.wd_id, :lang::VARCHAR, country.text
            FROM country
            JOIN owmf.wikidata AS wd ON wd.wd_wikidata_cod = country.cod
            LEFT JOIN owmf.wikidata_text AS wdt
                ON wdt.wdt_wd_id = wd.wd_id AND wdt.wdt_language = :lang::VARCHAR
            WHERE wdt IS NULL
            ON CONFLICT (wdt_wd_id, wdt_language) DO NOTHING"
        );
        $stInsertGenderText->bindValue("lang", $language, PDO::PARAM_STR);
        $stInsertGenderText->bindValue("result", $responseJSON, PDO::PARAM_LOB);
        //$stInsertGenderText->debugDumpParams();
        $stInsertGenderText->execute();
        if ($this->hasServerTiming())
            $this->getServerTiming()->add("wikidata-insert-gender-text");

        $downloadDateExtraUpdate = $this->eagerFullDownload ? "wd_download_date = CURRENT_TIMESTAMP," : "";
        $stInsertWikidata = $this->getDB()->prepare(
            "UPDATE owmf.wikidata 
            SET wd_position = ST_GeomFromText(response->'wkt_coords'->>'value', 4326),
                wd_event_date = owmf.parse_timestamp(response->'event_date'->>'value'),
                wd_event_date_precision = (response->'event_date_precision'->>'value')::INT,
                wd_start_date = owmf.parse_timestamp(response->'start_date'->>'value'),
                wd_start_date_precision = (response->'start_date_precision'->>'value')::INT,
                wd_end_date = owmf.parse_timestamp(response->'end_date'->>'value'),
                wd_end_date_precision = (response->'end_date_precision'->>'value')::INT,
                wd_birth_date = owmf.parse_timestamp(response->'birth_date'->>'value'),
                wd_birth_date_precision = (response->'birth_date_precision'->>'value')::INT,
                wd_death_date = owmf.parse_timestamp(response->'death_date'->>'value'),
                wd_death_date_precision = (response->'death_date_precision'->>'value')::INT,
                wd_commons = response->'commons'->>'value',
                wd_gender_id = gender.wd_id,
                wd_instance_id = instance.wd_id,
                wd_country_id = country.wd_id,
                $downloadDateExtraUpdate
                $downloadDateField = CURRENT_TIMESTAMP
            FROM json_array_elements((:result::JSON)->'results'->'bindings') AS response
            LEFT JOIN owmf.wikidata AS gender ON gender.wd_wikidata_cod = REPLACE(response->'genderID'->>'value', 'http://www.wikidata.org/entity/', '')
            LEFT JOIN owmf.wikidata AS instance ON instance.wd_wikidata_cod = REPLACE(response->'instanceID'->>'value', 'http://www.wikidata.org/entity/', '')
            LEFT JOIN owmf.wikidata AS country ON country.wd_wikidata_cod = REPLACE(response->'countryID'->>'value', 'http://www.wikidata.org/entity/', '')
            WHERE wikidata.$downloadDateField IS NULL
            AND wikidata.wd_wikidata_cod = REPLACE(response->'wikidata'->>'value', 'http://www.wikidata.org/entity/', '')"
        );
        $stInsertWikidata->bindValue("result", $responseJSON, PDO::PARAM_LOB);
        //$stInsertWikidata->debugDumpParams();
        $stInsertWikidata->execute();
        if ($this->hasServerTiming())
            $this->getServerTiming()->add("wikidata-insert-wikidata");

        if ($this->eagerFullDownload) {
            try {
                $stInsertPicture = $this->getDB()->prepare(
                    "INSERT INTO owmf.wikidata_picture (wdp_wd_id, wdp_picture)
                    SELECT DISTINCT wd.wd_id, REPLACE(pic.picture,'http://commons.wikimedia.org/wiki/Special:FilePath/','')
                    FROM owmf.wikidata AS wd
                    JOIN (
                        SELECT
                            REPLACE(response->'wikidata'->>'value', 'http://www.wikidata.org/entity/', '') AS wikidata_cod,
                            REGEXP_SPLIT_TO_TABLE(response->'pictures'->>'value', '||') AS picture
                        FROM json_array_elements((:result::JSON)->'results'->'bindings') AS response
                    ) AS pic ON pic.wikidata_cod = wd.wd_wikidata_cod
                    LEFT JOIN owmf.wikidata_picture AS wdp ON wd.wd_id = wdp.wdp_wd_id
                    WHERE pic.picture IS NOT NULL
                    AND pic.picture != ''
                    AND wdp IS NULL
                    ON CONFLICT (wdp_wd_id, wdp_picture) DO NOTHING
                    RETURNING CONCAT('File:',wdp_picture) AS picture"
                );
                $stInsertPicture->bindValue("result", $responseJSON, PDO::PARAM_LOB);
                //$stInsertPicture->debugDumpParams();
                $stInsertPicture->execute();
                if ($this->hasServerTiming())
                    $this->getServerTiming()->add("wikidata-picture-insert");
            } catch (Exception $e) {
                error_log("An error occurred while inserting pictures: " . $e->getMessage());
            }
        }

        $stUpdateText = $this->getDB()->prepare(
            "UPDATE owmf.wikidata_text
            SET wdt_full_download_date = CURRENT_TIMESTAMP,
                wdt_name = response->'name'->>'value',
                wdt_description = response->'description'->>'value',
                wdt_wikipedia_url = response->'wikipedia'->>'value',
                wdt_occupations = response->'occupations'->>'value',
                wdt_citizenship = response->'citizenship'->>'value',
                wdt_prizes = response->'prizes'->>'value',
                wdt_event_place = response->'event_place'->>'value',
                wdt_birth_place = response->'birth_place'->>'value',
                wdt_death_place = response->'death_place'->>'value'
            FROM json_array_elements((:result::JSON)->'results'->'bindings') AS response
            JOIN owmf.wikidata AS wd
                ON wd.wd_wikidata_cod = REPLACE(response->'wikidata'->>'value', 'http://www.wikidata.org/entity/', '')
            WHERE wdt_full_download_date IS NULL
            AND wdt_wd_id = wd_id
            AND wdt_language = :lang::VARCHAR
            AND response->'name'->>'value' IS NOT NULL"
        );
        $stUpdateText->bindValue("lang", $language, PDO::PARAM_STR);
        $stUpdateText->bindValue("result", $responseJSON, PDO::PARAM_LOB);
        //$stUpdateText->debugDumpParams();
        $stUpdateText->execute();
        if ($this->hasServerTiming())
            $this->getServerTiming()->add("wikidata-text-update");

        $stInsertText = $this->getDB()->prepare(
            "INSERT INTO owmf.wikidata_text (
                wdt_wd_id,
                wdt_language,
                wdt_full_download_date,
                wdt_name,
                wdt_description,
                wdt_wikipedia_url,
                wdt_occupations,
                wdt_citizenship,
                wdt_prizes,
                wdt_event_place,
                wdt_birth_place,
                wdt_death_place
            )
            SELECT DISTINCT
                wd_id,
                :lang::VARCHAR,
                CURRENT_TIMESTAMP,
                response->'name'->>'value',
                response->'description'->>'value',
                response->'wikipedia'->>'value',
                response->'occupations'->>'value',
                response->'citizenship'->>'value',
                response->'prizes'->>'value',
                response->'event_place'->>'value',
                response->'birth_place'->>'value',
                response->'death_place'->>'value'
            FROM json_array_elements((:result::JSON)->'results'->'bindings') AS response
            JOIN owmf.wikidata AS wd
                ON wd.wd_wikidata_cod = REPLACE(response->'wikidata'->>'value', 'http://www.wikidata.org/entity/', '')
            WHERE response->'name'->>'value' IS NOT NULL
            ON CONFLICT (wdt_wd_id, wdt_language) DO NOTHING"
        );
        $stInsertText->bindValue("lang", $language, PDO::PARAM_STR);
        $stInsertText->bindValue("result", $responseJSON, PDO::PARAM_LOB);
        try {
            $stInsertText->execute();
        } catch (Exception $e) {
            error_log("An error occurred while inserting the text for the language '$language'");
            throw $e;
        }
        if ($this->hasServerTiming())
            $this->getServerTiming()->add("wikidata-text-insert");
    }

    public function __toString(): string
    {
        return get_class($this) . ": " . $this->getBBox() . " / " . $this->language;
    }
}