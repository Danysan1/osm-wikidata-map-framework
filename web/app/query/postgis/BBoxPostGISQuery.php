<?php

namespace App\Query\PostGIS;

require_once(__DIR__ . "/../../BoundingBox.php");
require_once(__DIR__ . "/../../BaseStringSet.php");
require_once(__DIR__ . "/../../ServerTiming.php");
require_once(__DIR__ . "/../BBoxQuery.php");
require_once(__DIR__ . "/../wikidata/EtymologyIDListWikidataTextQuery.php");

use \PDO;
use \App\BoundingBox;
use \App\BaseStringSet;
use \App\ServerTiming;
use \App\Query\BBoxQuery;
use \App\Query\Wikidata\EtymologyIDListWikidataTextQuery;

abstract class BBoxPostGISQuery implements BBoxQuery
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
    }

    /**
     * @return void
     */
    protected function prepareSend()
    {
        $queryParams = [
            "min_lon" => $this->bbox->getMinLon(),
            "max_lon" => $this->bbox->getMaxLon(),
            "min_lat" => $this->bbox->getMinLat(),
            "max_lat" => $this->bbox->getMaxLat(),
            "lang" => $this->language,
        ];

        $stCheck = $this->db->prepare(
            "WITH
                wiki AS (
                    SELECT DISTINCT wd_id, wd_wikidata_cod, wd_gender_id, wd_instance_id
                    FROM etymology
                    JOIN wikidata ON et_wd_id = wd_id
                    JOIN element ON et_el_id = el_id
                    WHERE el_geometry @ ST_MakeEnvelope(:min_lon, :min_lat, :max_lon, :max_lat, 4326)
                )
            SELECT wd_wikidata_cod FROM wiki WHERE wd_id NOT IN (SELECT wdt_wd_id FROM wikidata_text WHERE wdt_language = :lang)
            UNION
            SELECT wd_miss.wd_wikidata_cod
            FROM wikidata AS wd_miss
            JOIN wiki ON wiki.wd_gender_id = wd_miss.wd_id OR wiki.wd_instance_id = wd_miss.wd_id
            WHERE wd_miss.wd_id NOT IN (SELECT wdt_wd_id FROM wikidata_text WHERE wdt_language = :lang)"
        );
        $stCheck->execute($queryParams);
        if ($this->serverTiming != null)
            $this->serverTiming->add("wikidata-text-query");

        $missingWikidataText = $stCheck->fetchAll(PDO::FETCH_NUM);
        if (!empty($missingWikidataText)) {
            //error_log("missingWikidataText=" . json_encode($missingWikidataText));
            $searchArray = array_column($missingWikidataText, 0);
            $searchSet = new BaseStringSet($searchArray);
            $wikidataQuery = new EtymologyIDListWikidataTextQuery(
                $searchSet,
                $this->language,
                $this->wikidataEndpointURL
            );
            $wikidataResult = $wikidataQuery->send();
            if ($this->serverTiming != null)
                $this->serverTiming->add("wikidata-text-download");

            //error_log("wikidataResult=$wikidataResult");
            $stInsert = $this->db->prepare(
                "INSERT INTO wikidata_text (
                    wdt_wd_id,
                    wdt_language,
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
                SELECT
                    wd_id,
                    :lang,
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
                JOIN wikidata ON wd_wikidata_cod = REPLACE(response->'wikidata'->>'value', 'http://www.wikidata.org/entity/', '')"
            );
            $stInsert->execute(["lang" => $this->language, "result" => $wikidataResult->getJSON()]);
        }
    }

    public function getBBox(): BoundingBox
    {
        return $this->bbox;
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
