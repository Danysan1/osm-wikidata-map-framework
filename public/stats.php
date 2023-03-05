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
use \App\Query\PostGIS\Stats\BBoxGenderStatsPostGISQuery;
use \App\Query\PostGIS\Stats\BBoxTypeStatsPostGISQuery;
use \App\Query\PostGIS\Stats\BBoxSourceStatsPostGISQuery;
use \App\Query\Wikidata\Stats\GenderStatsWikidataFactory;
use \App\Query\Wikidata\Stats\TypeStatsWikidataFactory;
use \App\Config\Overpass\RoundRobinOverpassConfig;
use App\Config\Wikidata\BaseWikidataConfig;
use \App\Query\Overpass\Stats\BBoxSourceStatsOverpassQuery;
use App\Query\PostGIS\Stats\BBoxCenturyStatsPostGISQuery;

$conf = new IniEnvConfiguration();
$serverTiming->add("1_readConfig");

prepareJSON($conf);
$serverTiming->add("2_prepare");

$source = (string)getFilteredParamOrDefault("source", FILTER_SANITIZE_SPECIAL_CHARS, "all_db");
$to = (string)getFilteredParamOrDefault("to", FILTER_UNSAFE_RAW, "geojson");
$language = (string)getFilteredParamOrDefault("language", FILTER_SANITIZE_SPECIAL_CHARS, (string)$conf->get('default_language'));
$overpassConfig = new RoundRobinOverpassConfig($conf);
$wikidataConfig = new BaseWikidataConfig($conf);
$cacheFileBasePath = (string)$conf->get("cache_file_base_path");
$enableDB = $conf->getBool("db_enable");

if ($enableDB && !in_array($source, ["overpass", "wd_direct", "wd_reverse", "wd_qualifier"]))
    $db = new PostGIS_PDO($conf);
else
    $db = null;

// "en-US" => "en"
$langMatches = [];
if (!preg_match(ISO_LANGUAGE_PATTERN, $language, $langMatches) || empty($langMatches[1])) {
    http_response_code(400);
    die('{"error":"Invalid language code."};');
}
$safeLanguage = (string)$langMatches[1];
//error_log($language." => ".json_encode($langMatches)." => ".$safeLanguage);

$textKey = (string)$conf->get('osm_text_key');
$descriptionKey = (string)$conf->get('osm_description_key');
$wikidataKeys = $conf->getWikidataKeys();
$wikidataKeyIDs = IniEnvConfiguration::keysToIDs($wikidataKeys);
$maxArea = (float)$conf->get("elements_bbox_max_area");
$bbox = BaseBoundingBox::fromInput(INPUT_GET, $maxArea);

if ($db != null) {
    if ($to == "genderStats") {
        $query = new BBoxGenderStatsPostGISQuery($bbox, $safeLanguage, $db, $wikidataConfig, $serverTiming, null, $source);
    } elseif ($to == "typeStats") {
        $query = new BBoxTypeStatsPostGISQuery($bbox, $safeLanguage, $db, $wikidataConfig, $serverTiming, null, $source);
    } elseif ($to == "centuryStats") {
        $query = new BBoxCenturyStatsPostGISQuery($bbox, $safeLanguage, $db, $wikidataConfig, $serverTiming, null, $source);
    } elseif ($to == "sourceStats") {
        $query = new BBoxSourceStatsPostGISQuery($bbox, $db, $serverTiming, $source);
    } else {
        throw new Exception("Bad 'to' parameter");
    }
} elseif ($source == "overpass") {
    if ($to == "genderStats") {
        $overpassQuery = new BBoxEtymologyOverpassQuery($wikidataKeys, $bbox, $overpassConfig, $textKey, $descriptionKey);
        $wikidataFactory = new GenderStatsWikidataFactory($safeLanguage, $wikidataConfig);
        $baseQuery = new BBoxStatsOverpassWikidataQuery($overpassQuery, $wikidataFactory, $serverTiming);
    } elseif ($to == "typeStats") {
        $overpassQuery = new BBoxEtymologyOverpassQuery($wikidataKeys, $bbox, $overpassConfig, $textKey, $descriptionKey);
        $wikidataFactory = new TypeStatsWikidataFactory($safeLanguage, $wikidataConfig);
        $baseQuery = new BBoxStatsOverpassWikidataQuery($overpassQuery, $wikidataFactory, $serverTiming);
    } elseif ($to == "centuryStats") {
        throw new Exception("Not implemented");
    } elseif ($to == "sourceStats") {
        $baseQuery = new BBoxSourceStatsOverpassQuery($wikidataKeys, $bbox, $overpassConfig);
    } else {
        throw new Exception("Bad 'to' parameter");
    }

    $cacheFileBasePath = (string)$conf->get("cache_file_base_path");
    $cacheFileBaseURL = (string)$conf->get("cache_file_base_url");
    $cacheTimeoutHours = (int)$conf->get("overpass_cache_timeout_hours");
    $query = new CSVCachedBBoxJSONQuery($baseQuery, $cacheFileBasePath, $serverTiming, $cacheTimeoutHours, $cacheFileBaseURL);
} elseif ($source == "wd_direct") {
    throw new Exception("Not implemented");
} elseif ($source == "wd_reverse") {
    throw new Exception("Not implemented");
} elseif ($source == "wd_qualifier") {
    throw new Exception("Not implemented");
} else {
    throw new Exception("Bad 'source' parameter");
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
} elseif ($result->hasPublicSourcePath()) {
    if ($conf->getBool("redirect_to_cache_file")) {
        $out = "";
        header("Location: " . $result->getPublicSourcePath());
    } else {
        $out = $result->getJSON();
        header("Cache-Location: " . $result->getPublicSourcePath());
    }
} else {
    $out = $result->getJSON();
}

$serverTiming->add("5_output");
$serverTiming->sendHeader();
echo $out;
