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
use \App\Query\PostGIS\Stats\BBoxGenderStatsPostGISQuery;
use \App\Query\PostGIS\Stats\BBoxTypeStatsPostGISQuery;
use \App\Query\PostGIS\Stats\BBoxSourceStatsPostGISQuery;
use \App\Query\Wikidata\Stats\GenderStatsWikidataFactory;
use \App\Query\Wikidata\Stats\TypeStatsWikidataFactory;
use \App\Query\Overpass\RoundRobinOverpassConfig;
use \App\Query\Overpass\Stats\BBoxSourceStatsOverpassQuery;

$conf = new IniEnvConfiguration();
$serverTiming->add("1_readConfig");

prepareJSON($conf);
$serverTiming->add("2_prepare");

$source = (string)getFilteredParamOrDefault("source", FILTER_SANITIZE_SPECIAL_CHARS, "all");
$to = (string)getFilteredParamOrDefault("to", FILTER_UNSAFE_RAW, "geojson");
$language = (string)getFilteredParamOrDefault("language", FILTER_SANITIZE_SPECIAL_CHARS, (string)$conf->get('default_language'));
$overpassConfig = new RoundRobinOverpassConfig($conf);
$wikidataEndpointURL = (string)$conf->get('wikidata_endpoint');
$cacheFileBasePath = (string)$conf->get("cache_file_base_path");
$enableDB = $conf->getDbEnable();

if ($enableDB && $source != "overpass")
    $db = new PostGIS_PDO($conf);
else
    $db = null;

// "en-US" => "en"
$langMatches = [];
if (!preg_match(ISO_LANGUAGE_PATTERN, $language, $langMatches) || empty($langMatches[1])) {
    http_response_code(400);
    die('{"error":"Invalid language code."};');
}
$safeLanguage = $langMatches[1];
//error_log($language." => ".json_encode($langMatches)." => ".$safeLanguage);

$maxArea = (float)$conf->get("elements_bbox_max_area");
$bbox = BaseBoundingBox::fromInput(INPUT_GET, $maxArea);

if ($db != null) {
    if ($to == "genderStats") {
        $query = new BBoxGenderStatsPostGISQuery(
            $bbox,
            $safeLanguage,
            $db,
            $wikidataEndpointURL,
            $serverTiming,
            true,
            null,
            $source
        );
    } elseif ($to == "typeStats") {
        $query = new BBoxTypeStatsPostGISQuery(
            $bbox,
            $safeLanguage,
            $db,
            $wikidataEndpointURL,
            $serverTiming,
            true,
            null,
            $source
        );
    } elseif ($to == "sourceStats") {
        $query = new BBoxSourceStatsPostGISQuery(
            $bbox,
            $db,
            $serverTiming,
            $source
        );
    } else {
        throw new Exception("Bad 'to' parameter");
    }
} else {
    if ($to == "genderStats") {
        $wikidataFactory = new GenderStatsWikidataFactory($safeLanguage, $wikidataEndpointURL);
        $baseQuery = new BBoxStatsOverpassWikidataQuery($bbox, $overpassConfig, $wikidataFactory, $serverTiming);
    } elseif ($to == "typeStats") {
        $wikidataFactory = new TypeStatsWikidataFactory($safeLanguage, $wikidataEndpointURL);
        $baseQuery = new BBoxStatsOverpassWikidataQuery($bbox, $overpassConfig, $wikidataFactory, $serverTiming);
    } elseif ($to == "sourceStats") {
        $baseQuery = new BBoxSourceStatsOverpassQuery($bbox, $overpassConfig, $serverTiming);
    } else {
        throw new Exception("Bad 'to' parameter");
    }

    $query = new CSVCachedBBoxJSONQuery(
        $baseQuery,
        $cacheFileBasePath . $safeLanguage . "_",
        $conf,
        $serverTiming
    );
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
