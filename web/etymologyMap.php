<?php
require_once("./app/ServerTiming.php");

use \App\ServerTiming;

$serverTiming = new ServerTiming();

require_once("./app/IniFileConfiguration.php");
require_once("./app/BaseBoundingBox.php");
require_once("./app/result/GeoJSONQueryResult.php");
require_once("./app/query/wikidata/CachedEtymologyIDListWikidataFactory.php");
require_once("./app/query/decorators/CachedBBoxGeoJSONQuery.php");
require_once("./app/query/combined/BBoxEtymologyOverpassWikidataQuery.php");
require_once("./app/query/overpass/RoundRobinOverpassConfig.php");
require_once("./funcs.php");
$serverTiming->add("0_include");

use \App\IniFileConfiguration;
use \App\BaseBoundingBox;
use \App\Result\GeoJSONQueryResult;
use App\Query\Decorators\CachedBBoxGeoJSONQuery;
use \App\Query\Combined\BBoxEtymologyOverpassWikidataQuery;
use App\Query\Wikidata\CachedEtymologyIDListWikidataFactory;
use App\Query\Overpass\RoundRobinOverpassConfig;

$conf = new IniFileConfiguration();
$serverTiming->add("1_readConfig");

prepareJSON($conf);
$serverTiming->add("2_prepare");

$from = (string)getFilteredParamOrError("from", FILTER_SANITIZE_STRING);
$language = (string)getFilteredParamOrDefault("language", FILTER_SANITIZE_STRING, (string)$conf->get('default-language'));
$overpassConfig = new RoundRobinOverpassConfig($conf);
$wikidataEndpointURL = (string)$conf->get('wikidata-endpoint');
$cacheFileBasePath = (string)$conf->get("cache-file-base-path");

// "en-US" => "en"
$langMatches = [];
if (!preg_match('/^([a-z]{2})(-[A-Z]{2})?$/', $language, $langMatches) || empty($langMatches[1])) {
    throw new Exception("Invalid language code");
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

    $wikidataFactory = new CachedEtymologyIDListWikidataFactory(
        $safeLanguage,
        $wikidataEndpointURL,
        $cacheFileBasePath . $safeLanguage . "_",
        $conf
    );
    $query = new BBoxEtymologyOverpassWikidataQuery(
        $bbox,
        $overpassConfig,
        $wikidataFactory,
        $serverTiming
    );
} else {
    http_response_code(400);
    die('{"error":"You must specify the BBox"}');
}

$cachedQuery = new CachedBBoxGeoJSONQuery($query, $cacheFileBasePath . $safeLanguage . "_", $conf, $serverTiming);

$serverTiming->add("3_init");

$result = $cachedQuery->send();
$serverTiming->add("4_query");
if (!$result->isSuccessful()) {
    http_response_code(500);
    error_log("Query error: " . $result);
    $out = '{"error":"Error getting result (overpass/wikidata server error)"}';
} elseif (!$result->hasResult()) {
    http_response_code(500);
    error_log("Query no result: " . $result);
    $out = '{"error":"Error getting result (bad response)"}';
} elseif ($result->hasPublicSourcePath() && $conf->has("redirect-to-cache-file") && (bool)$conf->get("redirect-to-cache-file")) {
    $out = "";
    header("Location: " . $result->getPublicSourcePath());
} else {
    $out = $result->getGeoJSON();
}

$serverTiming->add("5_output");
$serverTiming->sendHeader();
echo $out;
