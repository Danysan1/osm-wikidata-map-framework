<?php

namespace App\Query\PostGIS;

require_once(__DIR__ . "/../../BoundingBox.php");
require_once(__DIR__ . "/../../BaseStringSet.php");
require_once(__DIR__ . "/../../ServerTiming.php");
require_once(__DIR__ . "/../BBoxQuery.php");
require_once(__DIR__ . "/BBoxPostGISQuery.php");
require_once(__DIR__ . "/../wikidata/EtymologyIDListJSONWikidataQuery.php");
require_once(__DIR__ . "/../commons/AttributionCommonsQuery.php");

use \PDO;
use \App\BoundingBox;
use \App\BaseStringSet;
use App\Query\Commons\AttributionCommonsQuery;
use \App\ServerTiming;
use \App\Query\PostGIS\BBoxPostGISQuery;
use \App\Query\Wikidata\EtymologyIDListJSONWikidataQuery;
use Exception;

abstract class BBoxTextPostGISQuery extends BBoxPostGISQuery
{
    private string $language;
    private string $wikidataEndpointURL;
    private bool $fetchAttribution;
    private ?int $maxElements;

    public function __construct(
        BoundingBox $bbox,
        string $language,
        PDO $db,
        string $wikidataEndpointURL,
        ?ServerTiming $serverTiming = null,
        bool $fetchAttribution = true,
        ?int $maxElements = null,
        ?string $source = null
    ) {
        parent::__construct($bbox, $db, $serverTiming, $source);

        if ($maxElements !== null && $maxElements <= 0) {
            throw new Exception("maxElements must be > 0");
        }

        $this->language = $language;
        $this->wikidataEndpointURL = $wikidataEndpointURL;
        $this->fetchAttribution = $fetchAttribution;
        $this->maxElements = $maxElements;
    }

    public function getLanguage(): string
    {
        return $this->language;
    }

    public function getWikidataEndpointURL(): string
    {
        return $this->wikidataEndpointURL;
    }

    protected function getMaxElements(): int|null
    {
        return $this->maxElements;
    }

    protected function getLimitClause(): string
    {
        return $this->maxElements === null ? ' ' : " LIMIT $this->maxElements ";
    }

    protected function downloadMissingText(): void
    {
        $filterClause = $this->getFilterClause();
        $limitClause = $this->getLimitClause();
        $sthMissingWikidata = $this->getDB()->prepare(
            "SELECT DISTINCT wd.wd_wikidata_cod
            FROM oem.element AS el
            JOIN oem.etymology AS et ON et.et_el_id = el.el_id
            JOIN oem.wikidata AS wd ON et.et_wd_id = wd.wd_id
            LEFT JOIN oem.wikidata_text AS wdt
                ON wdt.wdt_wd_id = wd.wd_id AND wdt.wdt_language = :lang
            WHERE el.el_geometry @ ST_MakeEnvelope(:min_lon, :min_lat, :max_lon, :max_lat, 4326)
            $filterClause
            AND (wd.wd_full_download_date IS NULL OR wdt.wdt_full_download_date IS NULL)
            $limitClause"
        );
        $sthMissingWikidata->bindValue("min_lon", $this->getBBox()->getMinLon(), PDO::PARAM_STR);
        $sthMissingWikidata->bindValue("max_lon", $this->getBBox()->getMaxLon(), PDO::PARAM_STR);
        $sthMissingWikidata->bindValue("min_lat", $this->getBBox()->getMinLat(), PDO::PARAM_STR);
        $sthMissingWikidata->bindValue("max_lat", $this->getBBox()->getMaxLat(), PDO::PARAM_STR);
        $sthMissingWikidata->bindValue("lang", $this->language, PDO::PARAM_STR);
        //$sthMissingWikidata->debugDumpParams();
        $sthMissingWikidata->execute();
        if ($this->hasServerTiming())
            $this->getServerTiming()->add("missing-wikidata-query");

        $missingWikidataText = $sthMissingWikidata->fetchAll(PDO::FETCH_NUM);
        if (!empty($missingWikidataText)) {
            //error_log("missingWikidataText=" . json_encode($missingWikidataText));
            $searchArray = array_column($missingWikidataText, 0);
            $searchSet = new BaseStringSet($searchArray);
            $wikidataQuery = new EtymologyIDListJSONWikidataQuery(
                $searchSet,
                $this->language,
                $this->wikidataEndpointURL
            );
            $wikidataResult = $wikidataQuery->sendAndGetJSONResult();
            if ($this->hasServerTiming())
                $this->getServerTiming()->add("wikidata-text-download");

            //error_log("wikidataResult: " . $wikidataResult->getJSON());

            $stInsertGender = $this->getDB()->prepare(
                "INSERT INTO oem.wikidata (wd_wikidata_cod)
                SELECT DISTINCT REPLACE(value->'genderID'->>'value', 'http://www.wikidata.org/entity/', '')
                FROM json_array_elements((:result::JSON)->'results'->'bindings')
                LEFT JOIN oem.wikidata ON wd_wikidata_cod = REPLACE(value->'genderID'->>'value', 'http://www.wikidata.org/entity/', '')
                WHERE LEFT(value->'genderID'->>'value', 31) = 'http://www.wikidata.org/entity/'
                AND wikidata IS NULL
                UNION
                SELECT DISTINCT REPLACE(value->'instanceID'->>'value', 'http://www.wikidata.org/entity/', '')
                FROM json_array_elements((:result::JSON)->'results'->'bindings')
                LEFT JOIN oem.wikidata ON wd_wikidata_cod = REPLACE(value->'instanceID'->>'value', 'http://www.wikidata.org/entity/', '')
                WHERE LEFT(value->'instanceID'->>'value', 31) = 'http://www.wikidata.org/entity/'
                AND wikidata IS NULL
                ON CONFLICT (wd_wikidata_cod) DO NOTHING"
            );
            $stInsertGender->bindValue("result", $wikidataResult->getJSON(), PDO::PARAM_LOB);
            //$stInsertGender->debugDumpParams();
            $stInsertGender->execute();
            if ($this->hasServerTiming())
                $this->getServerTiming()->add("wikidata-insert-gender");

            $stInsertGenderText = $this->getDB()->prepare(
                "INSERT INTO oem.wikidata_text (wdt_wd_id, wdt_language, wdt_name)
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
                    )
                SELECT DISTINCT wd.wd_id, :lang::VARCHAR, gender.text
                FROM gender
                JOIN oem.wikidata AS wd ON wd.wd_wikidata_cod = gender.cod
                LEFT JOIN oem.wikidata_text AS wdt
                    ON wdt.wdt_wd_id = wd.wd_id AND wdt.wdt_language = :lang::VARCHAR
                WHERE wdt IS NULL
                UNION
                SELECT DISTINCT wd.wd_id, :lang::VARCHAR, instance.text
                FROM instance
                JOIN oem.wikidata AS wd ON wd.wd_wikidata_cod = instance.cod
                LEFT JOIN oem.wikidata_text AS wdt
                    ON wdt.wdt_wd_id = wd.wd_id AND wdt.wdt_language = :lang::VARCHAR
                WHERE wdt IS NULL
                ON CONFLICT (wdt_wd_id, wdt_language) DO NOTHING"
            );
            $stInsertGenderText->bindValue("lang", $this->language, PDO::PARAM_STR);
            $stInsertGenderText->bindValue("result", $wikidataResult->getJSON(), PDO::PARAM_LOB);
            //$stInsertGenderText->debugDumpParams();
            $stInsertGenderText->execute();
            if ($this->hasServerTiming())
                $this->getServerTiming()->add("wikidata-insert-gender-text");

            $stInsertWikidata = $this->getDB()->prepare(
                "UPDATE oem.wikidata 
                SET wd_position = ST_GeomFromText(response->'wkt_coords'->>'value', 4326),
                    wd_event_date = oem.parse_timestamp(response->'event_date'->>'value'),
                    wd_event_date_precision = (response->'event_date_precision'->>'value')::INT,
                    wd_start_date = oem.parse_timestamp(response->'start_date'->>'value'),
                    wd_start_date_precision = (response->'start_date_precision'->>'value')::INT,
                    wd_end_date = oem.parse_timestamp(response->'end_date'->>'value'),
                    wd_end_date_precision = (response->'end_date_precision'->>'value')::INT,
                    wd_birth_date = oem.parse_timestamp(response->'birth_date'->>'value'),
                    wd_birth_date_precision = (response->'birth_date_precision'->>'value')::INT,
                    wd_death_date = oem.parse_timestamp(response->'death_date'->>'value'),
                    wd_death_date_precision = (response->'death_date_precision'->>'value')::INT,
                    wd_commons = response->'commons'->>'value',
                    wd_gender_id = gender.wd_id,
                    wd_instance_id = instance.wd_id,
                    wd_full_download_date = CURRENT_TIMESTAMP
                FROM json_array_elements((:result::JSON)->'results'->'bindings') AS response
                LEFT JOIN oem.wikidata AS gender ON gender.wd_wikidata_cod = REPLACE(response->'genderID'->>'value', 'http://www.wikidata.org/entity/', '')
                LEFT JOIN oem.wikidata AS instance ON instance.wd_wikidata_cod = REPLACE(response->'instanceID'->>'value', 'http://www.wikidata.org/entity/', '')
                WHERE wikidata.wd_full_download_date IS NULL
                AND wikidata.wd_wikidata_cod = REPLACE(response->'wikidata'->>'value', 'http://www.wikidata.org/entity/', '')"
            );
            $stInsertWikidata->bindValue("result", $wikidataResult->getJSON(), PDO::PARAM_LOB);
            //$stInsertWikidata->debugDumpParams();
            $stInsertWikidata->execute();
            if ($this->hasServerTiming())
                $this->getServerTiming()->add("wikidata-insert-wikidata");

            try {
                $stInsertPicture = $this->getDB()->prepare(
                    "INSERT INTO oem.wikidata_picture (wdp_wd_id, wdp_picture)
                    SELECT DISTINCT wd.wd_id, REPLACE(pic.picture,'http://commons.wikimedia.org/wiki/Special:FilePath/','')
                    FROM oem.wikidata AS wd
                    JOIN (
                        SELECT
                            REPLACE(response->'wikidata'->>'value', 'http://www.wikidata.org/entity/', '') AS wikidata_cod,
                            REGEXP_SPLIT_TO_TABLE(response->'pictures'->>'value', '`') AS picture
                        FROM json_array_elements((:result::JSON)->'results'->'bindings') AS response
                    ) AS pic ON pic.wikidata_cod = wd.wd_wikidata_cod
                    LEFT JOIN oem.wikidata_picture AS wdp ON wd.wd_id = wdp.wdp_wd_id
                    WHERE pic.picture IS NOT NULL
                    AND pic.picture != ''
                    AND wdp IS NULL
                    ON CONFLICT (wdp_wd_id, wdp_picture) DO NOTHING
                    RETURNING CONCAT('File:',wdp_picture) AS picture"
                );
                $stInsertPicture->bindValue("result", $wikidataResult->getJSON(), PDO::PARAM_LOB);
                //$stInsertPicture->debugDumpParams();
                $stInsertPicture->execute();
                if ($this->hasServerTiming())
                    $this->getServerTiming()->add("wikidata-picture-insert");

                if ($this->fetchAttribution) {
                    $insertedPictures = $stInsertPicture->fetchAll();
                    $picturesToCheck = array_map(function (array $row): string {
                        return urldecode($row["picture"]);
                    }, $insertedPictures);
                    $attributions = AttributionCommonsQuery::splitTitlesInChunksAndGetAttributions($picturesToCheck);
                    $countAttributions = count($attributions);
                    if ($this->hasServerTiming())
                        $this->getServerTiming()->add("commons-attribution-fetch-$countAttributions");

                    foreach ($attributions as $attribution) {
                        $stInsertAttribution = $this->getDB()->prepare(
                            "UPDATE oem.wikidata_picture
                            SET wdp_attribution = :attribution, wdp_full_download_date = NOW()
                            WHERE CONCAT('File%3A',REPLACE(wdp_picture,'%20','+')) = :title"
                        );
                        $stInsertAttribution->bindValue("attribution", $attribution["attribution"], PDO::PARAM_STR);
                        $stInsertAttribution->bindValue("title", urlencode($attribution["picture"]), PDO::PARAM_STR);
                        //$stInsertAttribution->debugDumpParams();
                        $stInsertAttribution->execute();
                    }
                    if ($this->hasServerTiming())
                        $this->getServerTiming()->add("commons-attribution-insert");
                }
            } catch (Exception $e) {
                error_log("An error occurred while inserting pictures: " . $e->getMessage());
            }

            $stUpdateText = $this->getDB()->prepare(
                "UPDATE oem.wikidata_text
                SET wdt_full_download_date = CURRENT_TIMESTAMP,
                    wdt_name = response.value->'name'->>'value',
                    wdt_description = response.value->'description'->>'value',
                    wdt_wikipedia_url = response.value->'wikipedia'->>'value',
                    wdt_occupations = response.value->'occupations'->>'value',
                    wdt_citizenship = response.value->'citizenship'->>'value',
                    wdt_prizes = response.value->'prizes'->>'value',
                    wdt_event_place = response.value->'event_place'->>'value',
                    wdt_birth_place = response.value->'birth_place'->>'value',
                    wdt_death_place = response.value->'death_place'->>'value'
                FROM json_array_elements((:result::JSON)->'results'->'bindings') AS response
                JOIN oem.wikidata AS wd
                    ON wd.wd_wikidata_cod = REPLACE(response->'wikidata'->>'value', 'http://www.wikidata.org/entity/', '')
                WHERE wdt_full_download_date IS NULL
                AND wdt_wd_id = wd_id
                AND wdt_language = :lang"
            );
            $stUpdateText->bindValue("lang", $this->language, PDO::PARAM_STR);
            $stUpdateText->bindValue("result", $wikidataResult->getJSON(), PDO::PARAM_LOB);
            //$stUpdateText->debugDumpParams();
            $stUpdateText->execute();
            if ($this->hasServerTiming())
                $this->getServerTiming()->add("wikidata-text-update");

            $stInsertText = $this->getDB()->prepare(
                "INSERT INTO oem.wikidata_text (
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
                    :lang,
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
                JOIN oem.wikidata AS wd
                    ON wd.wd_wikidata_cod = REPLACE(response->'wikidata'->>'value', 'http://www.wikidata.org/entity/', '')
                LEFT JOIN oem.wikidata_text AS wdt
                    ON wdt.wdt_wd_id = wd.wd_id AND wdt.wdt_language = :lang
                WHERE wdt IS NULL"
            );
            $stInsertText->bindValue("lang", $this->language, PDO::PARAM_STR);
            $stInsertText->bindValue("result", $wikidataResult->getJSON(), PDO::PARAM_LOB);
            //$stInsertText->debugDumpParams();
            $stInsertText->execute();
            if ($this->hasServerTiming())
                $this->getServerTiming()->add("wikidata-text-insert");
        }
    }

    public function __toString(): string
    {
        return get_class($this) . ": " . $this->getBBox() . " / " . $this->getLanguage();
    }
}
