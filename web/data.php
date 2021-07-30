<?php
require_once("./funcs.php");
header( "Content-Type: application/json; charset=utf-8" );
$conf = new Configuration();

$minLat = (float)getFilteredParamOrError( "minLat", FILTER_VALIDATE_FLOAT );
$minLon = (float)getFilteredParamOrError( "minLon", FILTER_VALIDATE_FLOAT );
$maxLat = (float)getFilteredParamOrError( "maxLat", FILTER_VALIDATE_FLOAT );
$maxLon = (float)getFilteredParamOrError( "maxLon", FILTER_VALIDATE_FLOAT );

$overpassQuery = overpassQuery($minLat, $minLon, $maxLat, $maxLon);
$endpoint = $conf->get('overpass-endpoint');
$result = getOverpassResult($endpoint, $overpassQuery);
//echo $result;

$result = json_decode($result);
$result = $result->elements;
echo json_encode($result);

$geoJSON = [];



