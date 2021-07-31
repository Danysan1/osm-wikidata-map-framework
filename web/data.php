<?php
require_once("./Configuration.php");
require_once("./OverpassQuery.php");
require_once("./QueryResult.php");
require_once("./funcs.php");
$conf = new Configuration();
prepareJSON($conf);

$minLat = (float)getFilteredParamOrError( "minLat", FILTER_VALIDATE_FLOAT );
$minLon = (float)getFilteredParamOrError( "minLon", FILTER_VALIDATE_FLOAT );
$maxLat = (float)getFilteredParamOrError( "maxLat", FILTER_VALIDATE_FLOAT );
$maxLon = (float)getFilteredParamOrError( "maxLon", FILTER_VALIDATE_FLOAT );

$overpassQuery = OverpassQuery::FromBoundingBox($minLat, $minLon, $maxLat, $maxLon);
$endpoint = (string)$conf->get('overpass-endpoint');
$result = $overpassQuery->send($endpoint);
if($result->success()) {
    echo json_encode($result->parseJSONBody()["elements"]);
} else {
    http_response_code(500);
    die("Error getting result");
}




