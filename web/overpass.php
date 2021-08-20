<?php
require_once("./app/ServerTiming.php");
$serverTiming = new ServerTiming();

require_once("./app/IniFileConfiguration.php");
require_once("./app/CenterEtymologyOverpassQuery.php");
require_once("./app/BBoxEtymologyOverpassQuery.php");
//require_once("./app/BBoxEtymologySkeletonOverpassQuery.php");
require_once("./app/BBoxEtymologyCenterOverpassQuery.php");
require_once("./app/CachedBBoxQuery.php");
require_once("./funcs.php");
$serverTiming->add("include");

$conf = new IniFileConfiguration();
prepareJSON($conf);
$serverTiming->add("prepare");

$from = (string)getFilteredParamOrError( "from", FILTER_SANITIZE_STRING );
//$onlySkeleton = (bool)getFilteredParamOrDefault( "onlySkeleton", FILTER_VALIDATE_BOOLEAN, false );
$onlyCenter = (bool)getFilteredParamOrDefault( "onlyCenter", FILTER_VALIDATE_BOOLEAN, false );
$overpassEndpointURL = (string)$conf->get('overpass-endpoint');
if ($from == "bbox") {
    $minLat = (float)getFilteredParamOrError( "minLat", FILTER_VALIDATE_FLOAT );
    $minLon = (float)getFilteredParamOrError( "minLon", FILTER_VALIDATE_FLOAT );
    $maxLat = (float)getFilteredParamOrError( "maxLat", FILTER_VALIDATE_FLOAT );
    $maxLon = (float)getFilteredParamOrError( "maxLon", FILTER_VALIDATE_FLOAT );

    $bboxArea = ($maxLat-$minLat) * ($maxLon-$minLon);
    //error_log("BBox area: $bboxArea");
    $maxArea = (float)$conf->get("overpass-bbox-max-area");
    if($bboxArea > $maxArea) {
        http_response_code(400);
        die('{"error":"The requested area is too large. Please use a smaller area."};');
    }
    
    /*if($onlySkeleton) {
        $baseQuery = new BBoxEtymologySkeletonOverpassQuery(
            $minLat, $minLon, $maxLat, $maxLon, $overpassEndpointURL
        );
    } else*/if ($onlyCenter) {
        $baseQuery = new BBoxEtymologyCenterOverpassQuery(
            $minLat, $minLon, $maxLat, $maxLon, $overpassEndpointURL
        );
    } else {
        $baseQuery = new BBoxEtymologyOverpassQuery(
            $minLat, $minLon, $maxLat, $maxLon, $overpassEndpointURL
        );
    }
    $overpassQuery = new CachedBBoxQuery(
        $baseQuery,
        (string)$conf->get("cache-file-base-path"),
        (int)$conf->get("cache-timeout-hours"),
        $serverTiming
    );
} elseif ($from == "center") {
    $centerLat = (float)getFilteredParamOrError( "centerLat", FILTER_VALIDATE_FLOAT );
    $centerLon = (float)getFilteredParamOrError( "centerLon", FILTER_VALIDATE_FLOAT );
    $radius = (float)getFilteredParamOrError( "radius", FILTER_VALIDATE_FLOAT );
    $overpassQuery = new CenterEtymologyOverpassQuery($centerLat, $centerLon, $radius, $overpassEndpointURL);
} else {
    http_response_code(400);
    die('{"error":"You must specify either the BBox or center and radius"}');
}

$format = (string)getFilteredParamOrDefault( "format", FILTER_SANITIZE_STRING, null );
$serverTiming->add("init");

$result = $overpassQuery->send();
$serverTiming->add("query");
if(!$result->isSuccessful()) {
    http_response_code(500);
    error_log("Overpass error: ".$result);
    $out = '{"error":"Error getting result (overpass server error)"}';
} elseif (!$result->hasResult()) {
    http_response_code(500);
    error_log("Overpass no result: ".$result);
    $out = '{"error":"Error getting result (bad response)"}';
} elseif ($format == "geojson") {
    $out = $result->getGeoJSON();
} else {
    $out = json_encode((array)$result->getResult()["elements"]);
}

$serverTiming->add("output");
$serverTiming->sendHeader();
echo $out;


