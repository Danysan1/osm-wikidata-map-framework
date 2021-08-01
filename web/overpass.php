<?php
require_once("./Configuration.php");
require_once("./OverpassQuery.php");
require_once("./QueryResult.php");
require_once("./funcs.php");
$conf = new Configuration();
prepareJSON($conf);

$minLat = (float)getFilteredParamOrDefault( "minLat", FILTER_VALIDATE_FLOAT, null );
$minLon = (float)getFilteredParamOrDefault( "minLon", FILTER_VALIDATE_FLOAT, null );
$maxLat = (float)getFilteredParamOrDefault( "maxLat", FILTER_VALIDATE_FLOAT, null );
$maxLon = (float)getFilteredParamOrDefault( "maxLon", FILTER_VALIDATE_FLOAT, null );

$centerLat = (float)getFilteredParamOrDefault( "centerLat", FILTER_VALIDATE_FLOAT, null );
$centerLon = (float)getFilteredParamOrDefault( "centerLon", FILTER_VALIDATE_FLOAT, null );
$radius = (float)getFilteredParamOrDefault( "radius", FILTER_VALIDATE_FLOAT, null );

if ($minLat!=null && $minLon!=null && $maxLat!=null && $maxLon!=null) {
    $overpassQuery = OverpassQuery::FromBoundingBox($minLat, $minLon, $maxLat, $maxLon);
} elseif ($centerLat!=null && $centerLon!=null && $radius!=null) {
    $overpassQuery = OverpassQuery::AroundPoint($centerLat, $centerLon, $radius);
} else {
    http_response_code(400);
    die('{"error":"You must specify either the BBox or center and radius"}');
}


$endpoint = (string)$conf->get('overpass-endpoint');
$result = $overpassQuery->send($endpoint);
if(!$result->success()) {
    http_response_code(500);
    $result->errorLogResponse("overpass");
    die('{"error":"Error getting result (overpass server error)"}');
} elseif (!$result->hasData() || !$result->isJSON()) {
    http_response_code(500);
    $result->errorLogResponse("overpass");
    die('{"error":"Error getting result (bad response)"}');
} else {
    echo json_encode((array)$result->parseJSONBody()["elements"]);
}




