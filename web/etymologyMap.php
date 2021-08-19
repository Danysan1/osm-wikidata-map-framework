<?php
require_once("./app/IniFileConfiguration.php");
require_once("./app/CachedBBoxEtymologyOverpassWikidataQuery.php");
require_once("./funcs.php");
$conf = new IniFileConfiguration();
prepareJSON($conf);

$from = (string)getFilteredParamOrError( "from", FILTER_SANITIZE_STRING );
$language = (string)getFilteredParamOrDefault( "language", FILTER_SANITIZE_STRING, (string)$conf->get('default-language') );
$overpassEndpointURL = (string)$conf->get('overpass-endpoint');
$wikidataEndpointURL = (string)$conf->get('wikidata-endpoint');
$cacheFileBasePath = (string)$conf->get("cache-file-base-path");
$cacheTimeoutHours = (int)$conf->get("cache-timeout-hours");

// "en-US" => "en"
$langMatches = [];
if(!preg_match('/^([a-z]{2})(-[A-Z]{2})?$/', $language, $langMatches) || empty($langMatches[1])) {
    throw new Exception("Invalid language code");
}
$safeLanguage = $langMatches[1];
//error_log($language." => ".json_encode($langMatches)." => ".$safeLanguage);

if ($from == "bbox") {
    $minLat = (float)getFilteredParamOrError( "minLat", FILTER_VALIDATE_FLOAT );
    $minLon = (float)getFilteredParamOrError( "minLon", FILTER_VALIDATE_FLOAT );
    $maxLat = (float)getFilteredParamOrError( "maxLat", FILTER_VALIDATE_FLOAT );
    $maxLon = (float)getFilteredParamOrError( "maxLon", FILTER_VALIDATE_FLOAT );

    $maxArea = (float)$conf->get("bbox-max-area");
    if((($maxLat-$minLat) * ($maxLon-$minLon)) > $maxArea) {
        http_response_code(400);
        die('{"error":"The requested area is too large. Please use a smaller area."};');
    }
    
    //$overpassQuery = new BBoxEtymologyOverpassQuery($minLat, $minLon, $maxLat, $maxLon);
    $overpassQuery = new CachedBBoxEtymologyOverpassWikidataQuery(
        $minLat,
        $minLon,
        $maxLat,
        $maxLon,
        $overpassEndpointURL,
        $wikidataEndpointURL,
        $safeLanguage,
        $cacheFileBasePath.$safeLanguage."_",
        $cacheTimeoutHours
    );
} else {
    http_response_code(400);
    die('{"error":"You must specify the BBox"}');
}

$format = (string)getFilteredParamOrDefault( "format", FILTER_SANITIZE_STRING, null );

$result = $overpassQuery->send();
if(!$result->isSuccessful()) {
    http_response_code(500);
    error_log("Query error: ".$result);
    die('{"error":"Error getting result (overpass/wikidata server error)"}');
} elseif (!$result->hasResult()) {
    http_response_code(500);
    error_log("Query no result: ".$result);
    die('{"error":"Error getting result (bad response)"}');
} elseif ($format == "geojson") {
    echo $result->getGeoJSON();
} else {
    echo json_encode((array)$result->getResult()["elements"]);
}




