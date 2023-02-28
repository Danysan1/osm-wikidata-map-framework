<?php

declare(strict_types=1);
require_once(__DIR__ . "/funcs.php");

use \App\ServerTiming;

$serverTiming = new ServerTiming();

use \App\Config\IniEnvConfiguration;
use \App\BaseBoundingBox;
use \App\PostGIS_PDO;
use \App\Query\Caching\CSVCachedBBoxGeoJSONQuery;
use \App\Query\Combined\BBoxGeoJSONEtymologyQuery;
use App\Query\Overpass\BBoxEtymologyOverpassQuery;
use \App\Query\Wikidata\CachedEtymologyIDListWikidataFactory;
use \App\Query\Overpass\RoundRobinOverpassConfig;
use \App\Query\PostGIS\BBoxEtymologyPostGISQuery;
use App\Query\Wikidata\DirectEtymologyWikidataQuery;
use App\Query\Wikidata\ReverseEtymologyWikidataQuery;

$conf = new IniEnvConfiguration();
$serverTiming->add("1_readConfig");

prepareGeoJSON($conf);
$serverTiming->add("2_prepare");

$source = (string)getFilteredParamOrDefault("source", FILTER_SANITIZE_SPECIAL_CHARS, "all_db");
$language = (string)getFilteredParamOrDefault("language", FILTER_SANITIZE_SPECIAL_CHARS, (string)$conf->get('default_language'));
$search = (string)getFilteredParamOrDefault("search", FILTER_SANITIZE_SPECIAL_CHARS, null);
$wikidataEndpointURL = (string)$conf->get('wikidata_endpoint');
$maxElements = $conf->has("max_elements") ? (int)$conf->get("max_elements") : null;

$enableDB = $conf->getBool("db_enable");
if ($enableDB && !in_array($source, ["overpass", "wd_reverse", "wd_direct"])) {
    //error_log("etymologyMap.php using DB");
    $db = new PostGIS_PDO($conf);
} else {
    //error_log("etymologyMap.php NOT using DB");
    $db = null;
}
$textKey = (string)$conf->get('osm_text_key');
$descriptionKey = (string)$conf->get('osm_description_key');
$wikidataKeys = $conf->getWikidataKeys();
$wikidataKeyIDs = IniEnvConfiguration::keysToIDs($wikidataKeys);

// "en-US" => "en"
$langMatches = [];
if (!preg_match(ISO_LANGUAGE_PATTERN, $language, $langMatches) || empty($langMatches[1])) {
    http_response_code(400);
    die('{"error":"Invalid language code."};');
}
$safeLanguage = $langMatches[1];
//error_log($language." => ".json_encode($langMatches)." => ".$safeLanguage);

$maxArea = (float)$conf->get("wikidata_bbox_max_area");
$bbox = BaseBoundingBox::fromInput(INPUT_GET, $maxArea);

if ($db != null) {
    $query = new BBoxEtymologyPostGISQuery($bbox, $safeLanguage, $db, $wikidataEndpointURL, $textKey, $descriptionKey, $serverTiming, $maxElements, $source, $search);
} else {
    $cacheFileBasePath = $safeLanguage . "_" . (string)$conf->get("cache_file_base_path");
    $cacheFileBaseURL = (string)$conf->get("cache_file_base_url");
    $cacheTimeoutHours = (int)$conf->get("overpass_cache_timeout_hours");

    if ($source == "wd_direct") {
        $wikidataProps = $conf->getArray("osm_wikidata_properties");
        $baseQuery = new DirectEtymologyWikidataQuery($bbox, $wikidataProps, $language, $wikidataEndpointURL);
    } elseif ($source == "wd_reverse") {
        $wikidataProperty = (string)$conf->get("wikidata_reverse_property");
        $imageProperty = $conf->has("wikidata_image_property") ? (string)$conf->get("wikidata_image_property") : null;
        $baseQuery = new ReverseEtymologyWikidataQuery($bbox, $wikidataProperty, $wikidataEndpointURL, $imageProperty);
    } else {
        $overpassConfig = new RoundRobinOverpassConfig($conf);
        $baseQuery = new BBoxEtymologyOverpassQuery($wikidataKeys, $bbox, $overpassConfig, $textKey, $descriptionKey);
    }

    $wikidataFactory = new CachedEtymologyIDListWikidataFactory($safeLanguage, $wikidataEndpointURL, $cacheFileBasePath, $conf, $serverTiming);
    $combinedQuery = new BBoxGeoJSONEtymologyQuery($baseQuery, $wikidataFactory, $serverTiming);
    $query = new CSVCachedBBoxGeoJSONQuery($combinedQuery, $cacheFileBasePath, $serverTiming, $cacheTimeoutHours, $cacheFileBaseURL);
}

$serverTiming->add("3_init");

$result = $query->sendAndGetGeoJSONResult();
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
        $out = $result->getGeoJSON();
        header("Cache-Location: " . $result->getPublicSourcePath());
    }
} else {
    $out = $result->getGeoJSON();
}

$serverTiming->add("5_output");
$serverTiming->sendHeader();
echo $out;
