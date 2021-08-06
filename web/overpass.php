<?php
require_once("./app/IniFileConfiguration.php");
require_once("./app/CenterEtymologyOverpassQuery.php");
require_once("./app/CachedBBoxEtymologyOverpassQuery.php");
require_once("./funcs.php");
$conf = new IniFileConfiguration();
prepareJSON($conf);

$from = (string)getFilteredParamOrError( "from", FILTER_SANITIZE_STRING );
$overpassEndpointURL = (string)$conf->get('overpass-endpoint');
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
    $overpassQuery = new CachedBBoxEtymologyOverpassQuery(
        $minLat,
        $minLon,
        $maxLat,
        $maxLon,
        $overpassEndpointURL,
        (string)$this->config->get("cache-file-base-path"),
        (int)$this->config->get("cache-timeout-hours")
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

$result = $overpassQuery->send();
if(!$result->isSuccessful()) {
    http_response_code(500);
    error_log("Overpass error: ".$result);
    die('{"error":"Error getting result (overpass server error)"}');
} elseif (!$result->hasResult()) {
    http_response_code(500);
    error_log("Overpass no result: ".$result);
    die('{"error":"Error getting result (bad response)"}');
} elseif ($format == "geojson") {
    echo $result->getGeoJSON();
} else {
    echo json_encode((array)$result->getResult()["elements"]);
}




