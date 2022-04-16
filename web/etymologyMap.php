<?php
require_once("./app/ServerTiming.php");

use \App\ServerTiming;

$serverTiming = new ServerTiming();

require_once(__DIR__ . "/app/IniEnvConfiguration.php");
require_once(__DIR__ . "/app/BaseBoundingBox.php");
require_once(__DIR__ . "/app/PostGIS_PDO.php");
require_once(__DIR__ . "/app/query/wikidata/CachedEtymologyIDListWikidataFactory.php");
require_once(__DIR__ . "/app/query/cache/CSVCachedBBoxGeoJSONQuery.php");
require_once(__DIR__ . "/app/query/combined/BBoxGeoJSONEtymologyQuery.php");
require_once(__DIR__ . "/app/query/postgis/BBoxEtymologyPostGISQuery.php");
require_once(__DIR__ . "/app/query/overpass/RoundRobinOverpassConfig.php");
require_once(__DIR__ . "/funcs.php");
$serverTiming->add("0_include");

use \App\IniEnvConfiguration;
use \App\BaseBoundingBox;
use \App\PostGIS_PDO;
use \App\Query\Cache\CSVCachedBBoxGeoJSONQuery;
use \App\Query\Combined\BBoxGeoJSONEtymologyQuery;
use \App\Query\Wikidata\CachedEtymologyIDListWikidataFactory;
use \App\Query\Overpass\RoundRobinOverpassConfig;
use \App\Query\PostGIS\BBoxEtymologyPostGISQuery;

$conf = new IniEnvConfiguration();
$serverTiming->add("1_readConfig");

prepareJSON($conf);
$serverTiming->add("2_prepare");

$language = (string)getFilteredParamOrDefault("language", FILTER_SANITIZE_SPECIAL_CHARS, (string)$conf->get('default-language'));
$overpassConfig = new RoundRobinOverpassConfig($conf);
$wikidataEndpointURL = (string)$conf->get('wikidata-endpoint');
$cacheFileBasePath = (string)$conf->get("cache-file-base-path");
$maxElements = $conf->has("max-elements") ? (int)$conf->get("max-elements") : null;

$enableDB = $conf->getBool("db-enable");
if ($enableDB) {
    //error_log("etymologyMap.php using DB");
    $db = new PostGIS_PDO($conf);
} else {
    //error_log("etymologyMap.php NOT using DB");
}

// "en-US" => "en"
$langMatches = [];
if (!preg_match('/^([a-z]{2})(-[A-Z]{2})?$/', $language, $langMatches) || empty($langMatches[1])) {
    http_response_code(400);
    die('{"error":"Invalid language code."};');
}
$safeLanguage = $langMatches[1];
//error_log($language." => ".json_encode($langMatches)." => ".$safeLanguage);

$bboxMargin = $conf->has("bbox-margin") ? (float)$conf->get("bbox-margin") : 0;
$minLat = (float)getFilteredParamOrError("minLat", FILTER_VALIDATE_FLOAT);
$minLon = (float)getFilteredParamOrError("minLon", FILTER_VALIDATE_FLOAT);
$maxLat = (float)getFilteredParamOrError("maxLat", FILTER_VALIDATE_FLOAT);
$maxLon = (float)getFilteredParamOrError("maxLon", FILTER_VALIDATE_FLOAT);

$bbox = new BaseBoundingBox(
    $minLat - $bboxMargin,
    $minLon - $bboxMargin,
    $maxLat + $bboxMargin,
    $maxLon + $bboxMargin
);
$bboxArea = $bbox->getArea();
//error_log("BBox area: $bboxArea");
$maxArea = (float)$conf->get("wikidata-bbox-max-area");
if ($bboxArea > $maxArea) {
    http_response_code(400);
    die('{"error":"The requested area is too large. Please use a smaller area."};');
}

if (!empty($db)) {
    $query = new BBoxEtymologyPostGISQuery(
        $bbox,
        $safeLanguage,
        $db,
        $wikidataEndpointURL,
        $serverTiming,
        true,
        $maxElements
    );
} else {
    $wikidataFactory = new CachedEtymologyIDListWikidataFactory(
        $safeLanguage,
        $wikidataEndpointURL,
        $cacheFileBasePath . $safeLanguage . "_",
        $conf
    );
    $baseQuery = new BBoxGeoJSONEtymologyQuery(
        $bbox,
        $overpassConfig,
        $wikidataFactory,
        $serverTiming
    );
    $query = new CSVCachedBBoxGeoJSONQuery(
        $baseQuery,
        $cacheFileBasePath . $safeLanguage . "_",
        $conf,
        $serverTiming
    );
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
    if ($conf->getBool("redirect-to-cache-file")) {
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
