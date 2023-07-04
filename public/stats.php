<?php

declare(strict_types=1);
require_once(__DIR__ . "/funcs.php");

use \App\ServerTiming;

$serverTiming = new ServerTiming();

use \App\Config\IniEnvConfiguration;
use \App\BaseBoundingBox;
use \App\PostGIS_PDO;
use \App\Query\Caching\CSVCachedBBoxJSONQuery;
use \App\Query\Combined\BBoxStatsOverpassWikidataQuery;
use App\Query\Overpass\BBoxEtymologyOverpassQuery;
use App\Query\PostGIS\Stats\BBoxWikidataStatsPostGISQuery;
use \App\Query\PostGIS\Stats\BBoxSourceStatsPostGISQuery;
use \App\Query\Wikidata\Stats\GenderStatsWikidataQuery;
use \App\Query\Wikidata\Stats\TypeStatsWikidataQuery;
use \App\Query\Wikidata\Stats\CountryStatsWikidataQuery;
use \App\Config\Overpass\RoundRobinOverpassConfig;
use App\Config\Wikidata\BaseWikidataConfig;
use App\Query\StaticStatsQuery;
use App\Query\PostGIS\Stats\BBoxStartCenturyStatsPostGISQuery;
use App\Query\PostGIS\Stats\BBoxEndCenturyStatsPostGISQuery;
use App\Query\Wikidata\AllIndirectEtymologyWikidataQuery;
use App\Query\Wikidata\CachedEtymologyIDListWikidataFactory;
use App\Query\Wikidata\DirectEtymologyWikidataQuery;
use App\Query\Wikidata\QualifierEtymologyWikidataQuery;
use App\Query\Wikidata\ReverseEtymologyWikidataQuery;
use App\Query\Wikidata\Stats\CenturyStatsWikidataQuery;

$conf = new IniEnvConfiguration();
$serverTiming->add("1_readConfig");

prepareJSON($conf);
$serverTiming->add("2_prepare");

$source = (string)getFilteredParamOrDefault("source", FILTER_SANITIZE_SPECIAL_CHARS, "overpass_all");
$to = (string)getFilteredParamOrDefault("to", FILTER_UNSAFE_RAW, "geojson");

$defaultLanguage = (string)$conf->get('default_language');
$language = (string)getFilteredParamOrDefault("language", FILTER_SANITIZE_SPECIAL_CHARS, $defaultLanguage);
$overpassConfig = new RoundRobinOverpassConfig($conf);
$wikidataConfig = new BaseWikidataConfig($conf);
$enableDB = $conf->getBool("db_enable");

if ($enableDB && str_starts_with($source, "db_"))
    $db = new PostGIS_PDO($conf);
else
    $db = null;

// "en-US" => "en"
$langMatches = [];
if (!preg_match(ISO_LANGUAGE_PATTERN, $language, $langMatches) || empty($langMatches[1])) {
    http_response_code(400);
    die('{"error":"Invalid language code."};');
}
/**
 * @psalm-suppress RedundantCastGivenDocblockType
 */
$safeLanguage = (string)$langMatches[1];
//error_log($language." => ".json_encode($langMatches)." => ".$safeLanguage);

$textKey = $conf->has('osm_text_key') ? (string)$conf->get('osm_text_key') : null;
$descriptionKey = $conf->has('osm_description_key') ? (string)$conf->get('osm_description_key') : null;

$maxArea = (float)$conf->get("wikidata_bbox_max_area");
$bbox = BaseBoundingBox::fromInput(INPUT_GET, $maxArea);

if ($db != null) {
    if ($to == "genderStats") {
        $query = new BBoxWikidataStatsPostGISQuery("wd_gender_id", "wd_gender_color", "wd_gender_descr", $bbox, $db, $wikidataConfig, $defaultLanguage, $safeLanguage, $serverTiming, null, $source);
    } elseif ($to == "typeStats") {
        $query = new BBoxWikidataStatsPostGISQuery("wd_instance_id", "wd_type_color", "wd_type_descr", $bbox, $db, $wikidataConfig, $defaultLanguage, $safeLanguage, $serverTiming, null, $source);
    } elseif ($to == "countryStats") {
        $query = new BBoxWikidataStatsPostGISQuery("wd_country_id", "wd_country_color", "wd_country_descr", $bbox, $db, $wikidataConfig, $defaultLanguage, $safeLanguage, $serverTiming, null, $source);
    } elseif ($to == "startCenturyStats" || $to == "centuryStats") {
        $query = new BBoxStartCenturyStatsPostGISQuery($bbox, $db, $wikidataConfig, $defaultLanguage, $safeLanguage, $serverTiming, null, $source);
    } elseif ($to == "endCenturyStats") {
        $query = new BBoxEndCenturyStatsPostGISQuery($bbox, $db, $wikidataConfig, $defaultLanguage, $safeLanguage, $serverTiming, null, $source);
    } elseif ($to == "sourceStats") {
        $query = new BBoxSourceStatsPostGISQuery($bbox, $db, $serverTiming, $source);
    } else {
        throw new Exception("Bad 'to' parameter");
    }
} else {
    $overpassCacheTimeoutHours = (int)$conf->get("overpass_cache_timeout_hours");
    $wikidataCacheTimeoutHours = (int)$conf->get("wikidata_cache_timeout_hours");
    if (str_starts_with($source, "overpass_")) {
        $keyID = str_replace("overpass_", "", $source);
        $wikidataKeys = $conf->getWikidataKeys($keyID);
        $sourceQuery = new BBoxEtymologyOverpassQuery($wikidataKeys, $bbox, $overpassConfig, $textKey, $descriptionKey, $defaultLanguage, $safeLanguage);
        $sourceName = "OpenStreetMap";
        $sourceColor = "#33ff66";
        $cacheTimeoutHours = $overpassCacheTimeoutHours;
    } else {
        $sourceName = "Wikidata";
        $sourceColor = "#3399ff";
        $cacheTimeoutHours = $wikidataCacheTimeoutHours;

        if ($source == "wd_direct") {
            $wikidataProps = $conf->getArray("osm_wikidata_properties");
            $sourceQuery = new DirectEtymologyWikidataQuery($bbox, $wikidataProps, $wikidataConfig, $defaultLanguage);
        } else if ($source == "wd_reverse") {
            $wikidataProperty = (string)$conf->get("wikidata_indirect_property");
            $sourceQuery = new ReverseEtymologyWikidataQuery($bbox, $wikidataProperty, $wikidataConfig, $defaultLanguage);
        } else if ($source == "wd_qualifier") {
            $wikidataProperty = (string)$conf->get("wikidata_indirect_property");
            $sourceQuery = new QualifierEtymologyWikidataQuery($bbox, $wikidataProperty, $wikidataConfig);
        } elseif ($source == "wd_indirect") {
            $wikidataProperty = (string)$conf->get("wikidata_indirect_property");
            $sourceQuery = new AllIndirectEtymologyWikidataQuery($bbox, $wikidataProperty, $wikidataConfig, $defaultLanguage);
        } else {
            throw new Exception("Bad 'source' parameter");
        }
    }

    $cacheFileBasePath = (string)$conf->get("cache_file_base_path");
    $cacheFileBaseURL = (string)$conf->get("cache_file_base_url");
    if ($to == "genderStats") {
        $wikidataFactory = GenderStatsWikidataQuery::Factory($safeLanguage, $wikidataConfig);
        $baseQuery = new BBoxStatsOverpassWikidataQuery($sourceQuery, $wikidataFactory, $serverTiming, "wikidata_genders.csv");
    } elseif ($to == "typeStats") {
        $wikidataFactory = TypeStatsWikidataQuery::Factory($safeLanguage, $wikidataConfig);
        $baseQuery = new BBoxStatsOverpassWikidataQuery($sourceQuery, $wikidataFactory, $serverTiming, "wikidata_types.csv");
    } elseif ($to == "countryStats") {
        $wikidataFactory = CountryStatsWikidataQuery::Factory($safeLanguage, $wikidataConfig);
        $baseQuery = new BBoxStatsOverpassWikidataQuery($sourceQuery, $wikidataFactory, $serverTiming, "wikidata_countries.csv");
    } elseif ($to == "startCenturyStats" || $to == "centuryStats") {
        $wikidataFactory = new CachedEtymologyIDListWikidataFactory($safeLanguage, $wikidataConfig, $cacheFileBasePath, $cacheFileBaseURL, $wikidataCacheTimeoutHours, false, $serverTiming);
        $baseQuery = new CenturyStatsWikidataQuery(['start_date', 'birth_date', 'event_date'], $sourceQuery, $wikidataFactory, $serverTiming);
    } elseif ($to == "endCenturyStats") {
        $wikidataFactory = new CachedEtymologyIDListWikidataFactory($safeLanguage, $wikidataConfig, $cacheFileBasePath, $cacheFileBaseURL, $wikidataCacheTimeoutHours, false, $serverTiming);
        $baseQuery = new CenturyStatsWikidataQuery(['end_date', 'death_date', 'event_date'], $sourceQuery, $wikidataFactory, $serverTiming);
    } elseif ($to == "sourceStats") {
        $baseQuery = new StaticStatsQuery($sourceQuery, $sourceName, $sourceColor);
    } else {
        throw new Exception("Bad 'to' parameter");
    }

    $query = new CSVCachedBBoxJSONQuery($baseQuery, $cacheFileBasePath, $serverTiming, $cacheTimeoutHours, $cacheFileBaseURL);
}

$serverTiming->add("3_init");

$result = $query->sendAndGetJSONResult();
$serverTiming->add("4_query");
if (!$result->isSuccessful()) {
    http_response_code(500);
    error_log("Query error: " . $result);
    $out = '{"error":"Error getting result (overpass/wikidata server error)"}';
} elseif (!$result->hasResult()) {
    http_response_code(500);
    error_log("Query no result: " . $result);
    $out = '{"error":"Error getting result (bad response)"}';
} else {
    $out = $result->getJSON();
    if ($result->hasPublicSourcePath())
        header("Cache-Location: " . $result->getPublicSourcePath());
}

$serverTiming->add("5_output");
$serverTiming->sendHeader();
echo $out;
