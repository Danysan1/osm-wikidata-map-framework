<?php
require_once("./app/ServerTiming.php");

use \App\ServerTiming;

$serverTiming = new ServerTiming();

require_once(__DIR__ . "/app/IniFileConfiguration.php");
require_once(__DIR__ . "/app/BaseBoundingBox.php");
require_once(__DIR__ . "/app/PostGIS_PDO.php");
require_once(__DIR__ . "/app/query/wikidata/CachedEtymologyIDListWikidataFactory.php");
require_once(__DIR__ . "/app/query/postgis/BBoxGenderStatsPostGISQuery.php");
require_once(__DIR__ . "/app/query/postgis/BBoxTypeStatsPostGISQuery.php");
require_once(__DIR__ . "/app/query/wikidata/GenderStatsWikidataFactory.php");
require_once(__DIR__ . "/app/query/wikidata/TypeStatsWikidataFactory.php");
require_once(__DIR__ . "/app/result/JSONQueryResult.php");
require_once(__DIR__ . "/app/query/cache/CSVCachedBBoxGeoJSONQuery.php");
require_once(__DIR__ . "/app/query/cache/CSVCachedBBoxJSONQuery.php");
require_once(__DIR__ . "/app/query/combined/BBoxGeoJSONEtymologyQuery.php");
require_once(__DIR__ . "/app/query/combined/BBoxStatsOverpassWikidataQuery.php");
require_once(__DIR__ . "/app/query/postgis/BBoxEtymologyPostGISQuery.php");
require_once(__DIR__ . "/app/query/overpass/RoundRobinOverpassConfig.php");
require_once(__DIR__ . "/funcs.php");
$serverTiming->add("0_include");

use \App\IniFileConfiguration;
use \App\BaseBoundingBox;
use App\PostGIS_PDO;
use \App\Query\Cache\CSVCachedBBoxGeoJSONQuery;
use \App\Query\Cache\CSVCachedBBoxJSONQuery;
use \App\Query\Combined\BBoxGeoJSONEtymologyQuery;
use \App\Query\Combined\BBoxStatsOverpassWikidataQuery;
use \App\Query\Wikidata\CachedEtymologyIDListWikidataFactory;
use \App\Query\PostGIS\BBoxGenderStatsPostGISQuery;
use \App\Query\PostGIS\BBoxTypeStatsPostGISQuery;
use \App\Query\Wikidata\GenderStatsWikidataFactory;
use \App\Query\Wikidata\TypeStatsWikidataFactory;
use \App\Query\Overpass\RoundRobinOverpassConfig;
use \App\Query\PostGIS\BBoxEtymologyPostGISQuery;

$conf = new IniFileConfiguration();
$serverTiming->add("1_readConfig");

prepareJSON($conf);
$serverTiming->add("2_prepare");

$from = (string)getFilteredParamOrDefault("from", FILTER_UNSAFE_RAW, "bbox");
$to = (string)getFilteredParamOrDefault("to", FILTER_UNSAFE_RAW, "geojson");
$language = (string)getFilteredParamOrDefault("language", FILTER_SANITIZE_SPECIAL_CHARS, (string)$conf->get('default-language'));
$overpassConfig = new RoundRobinOverpassConfig($conf);
$wikidataEndpointURL = (string)$conf->get('wikidata-endpoint');
$cacheFileBasePath = (string)$conf->get("cache-file-base-path");
$enableDB = $conf->getBool("db-enable");

if ($enableDB)
    $db = new PostGIS_PDO($conf);

// "en-US" => "en"
$langMatches = [];
if (!preg_match('/^([a-z]{2})(-[A-Z]{2})?$/', $language, $langMatches) || empty($langMatches[1])) {
    http_response_code(400);
    die('{"error":"Invalid language code."};');
}
$safeLanguage = $langMatches[1];
//error_log($language." => ".json_encode($langMatches)." => ".$safeLanguage);

if ($from == "bbox") {
    $bboxMargin = $conf->has("bbox-margin") ? (float)$conf->get("bbox-margin") : 0;
    $minLat = (float)getFilteredParamOrError("minLat", FILTER_VALIDATE_FLOAT) - $bboxMargin;
    $minLon = (float)getFilteredParamOrError("minLon", FILTER_VALIDATE_FLOAT) - $bboxMargin;
    $maxLat = (float)getFilteredParamOrError("maxLat", FILTER_VALIDATE_FLOAT) + $bboxMargin;
    $maxLon = (float)getFilteredParamOrError("maxLon", FILTER_VALIDATE_FLOAT) + $bboxMargin;
    $bbox = new BaseBoundingBox($minLat, $minLon, $maxLat, $maxLon);
    $bboxArea = $bbox->getArea();
    //error_log("BBox area: $bboxArea");
    $maxArea = (float)$conf->get("wikidata-bbox-max-area");
    if ($bboxArea > $maxArea) {
        http_response_code(400);
        die('{"error":"The requested area is too large. Please use a smaller area."};');
    }

    if ($to == "geojson") {
        if (!empty($db)) {
            $query = new BBoxEtymologyPostGISQuery(
                $bbox,
                $safeLanguage,
                $db,
                $wikidataEndpointURL,
                $serverTiming
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
    } elseif ($to == "genderStats" || $to == "typeStats") {
        if (!empty($db)) {
            if ($to == "genderStats") {
                $query = new BBoxGenderStatsPostGISQuery(
                    $bbox,
                    $safeLanguage,
                    $db,
                    $wikidataEndpointURL,
                    $serverTiming
                );
            } else {
                $query = new BBoxTypeStatsPostGISQuery(
                    $bbox,
                    $safeLanguage,
                    $db,
                    $wikidataEndpointURL,
                    $serverTiming
                );
            }
        } else {
            if ($to == "genderStats") {
                $wikidataFactory = new GenderStatsWikidataFactory($safeLanguage, $wikidataEndpointURL);
            } else {
                $wikidataFactory = new TypeStatsWikidataFactory($safeLanguage, $wikidataEndpointURL);
            }
            $baseQuery = new BBoxStatsOverpassWikidataQuery(
                $bbox,
                $overpassConfig,
                $wikidataFactory,
                $serverTiming
            );
            $query = new CSVCachedBBoxJSONQuery(
                $baseQuery,
                $cacheFileBasePath . $safeLanguage . "_",
                $conf,
                $serverTiming
            );
        }
    } else {
        http_response_code(400);
        die('{"error":"You must specify a valid output type"}');
    }
} else {
    http_response_code(400);
    die('{"error":"You must specify a valid search area"}');
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
    if ($conf->getBool("redirect-to-cache-file")) {
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
