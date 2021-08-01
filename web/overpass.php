<?php
require_once("./Configuration.php");
require_once("./OverpassQuery.php");
require_once("./OverpassResult.php");
require_once("./funcs.php");
$conf = new Configuration();
prepareJSON($conf);

$from = (string)getFilteredParamOrError( "from", FILTER_SANITIZE_STRING );
if ($from == "bbox") {
    $minLat = (float)getFilteredParamOrError( "minLat", FILTER_VALIDATE_FLOAT );
    $minLon = (float)getFilteredParamOrError( "minLon", FILTER_VALIDATE_FLOAT );
    $maxLat = (float)getFilteredParamOrError( "maxLat", FILTER_VALIDATE_FLOAT );
    $maxLon = (float)getFilteredParamOrError( "maxLon", FILTER_VALIDATE_FLOAT );
    $overpassQuery = OverpassQuery::FromBoundingBox($minLat, $minLon, $maxLat, $maxLon);
} elseif ($from == "center") {
    $centerLat = (float)getFilteredParamOrError( "centerLat", FILTER_VALIDATE_FLOAT );
    $centerLon = (float)getFilteredParamOrError( "centerLon", FILTER_VALIDATE_FLOAT );
    $radius = (float)getFilteredParamOrError( "radius", FILTER_VALIDATE_FLOAT );
    $overpassQuery = OverpassQuery::AroundPoint($centerLat, $centerLon, $radius);
} else {
    http_response_code(400);
    die('{"error":"You must specify either the BBox or center and radius"}');
}

$format = (string)getFilteredParamOrDefault( "format", FILTER_SANITIZE_STRING, null );

$endpoint = (string)$conf->get('overpass-endpoint');
$result = $overpassQuery->send($endpoint);
if(!$result->isSuccessful()) {
    http_response_code(500);
    $result->errorLogResponse("overpass");
    die('{"error":"Error getting result (overpass server error)"}');
} elseif (!$result->hasData() || !$result->isJSON()) {
    http_response_code(500);
    $result->errorLogResponse("overpass");
    die('{"error":"Error getting result (bad response)"}');
} elseif ($format == "geojson") {
    echo $result->toGeoJSON();
} else {
    echo json_encode((array)$result->parseJSONBody()["elements"]);
}




