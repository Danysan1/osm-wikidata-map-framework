<?php
require_once("./funcs.php");
header( "Content-Type: application/json" );

$conf = parse_ini_file("/etc/open-etymology-map.ini");
if(empty($conf)) {
	http_response_code(500);
	die(json_encode(["error" => "Configuration file not found"]));
}
//echo json_encode($conf);

$minLat = empty($_GET["minLat"]) ? throw new ValueError("Missing minLat") : $_GET["minLat"];
$minLon = empty($_GET["minLon"]) ? throw new ValueError("Missing minLon") : $_GET["minLon"];
$maxLat = empty($_GET["maxLat"]) ? throw new ValueError("Missing maxLat") : $_GET["maxLat"];
$maxLon = empty($_GET["maxLon"]) ? throw new ValueError("Missing maxLon") : $_GET["maxLon"];

$overpassQuery = overpassQuery($minLat, $minLon, $maxLat, $maxLon);
$endpoint = $conf['overpass-endpoint'];
$result = getOverpassResult($endpoint, $overpassQuery);
//echo $result;

$elements = json_decode($result, true)["elements"];
echo json_encode($elements);
