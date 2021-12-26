<?php
require_once("./app/ServerTiming.php");

use \App\ServerTiming;

$serverTiming = new ServerTiming();

require_once("./app/IniFileConfiguration.php");
require_once("./app/BaseBoundingBox.php");
require_once("./app/PostGIS_PDO.php");
require_once("./app/query/overpass/CenterEtymologyOverpassQuery.php");
require_once("./app/query/overpass/BBoxEtymologyOverpassQuery.php");
require_once("./app/query/overpass/BBoxEtymologyCenterOverpassQuery.php");
require_once("./app/query/postgis/BBoxEtymologyCenterPostGISQuery.php");
require_once("./app/query/overpass/RoundRobinOverpassConfig.php");
require_once("./app/query/cache/CSVCachedBBoxGeoJSONQuery.php");
require_once("./funcs.php");
$serverTiming->add("0_include");

use \App\IniFileConfiguration;
use \App\BaseBoundingBox;
use App\PostGIS_PDO;
use App\Query\Overpass\BBoxEtymologyCenterOverpassQuery;
use App\Query\PostGIS\BBoxEtymologyCenterPostGISQuery;
use App\Query\Overpass\CenterEtymologyOverpassQuery;
use App\Query\Cache\CSVCachedBBoxGeoJSONQuery;
use App\Query\Overpass\RoundRobinOverpassConfig;

$conf = new IniFileConfiguration();
$serverTiming->add("1_readConfig");

prepareJSON($conf);
$serverTiming->add("2_prepare");

$from = (string)getFilteredParamOrError("from", FILTER_UNSAFE_RAW);
//$onlySkeleton = (bool)getFilteredParamOrDefault( "onlySkeleton", FILTER_VALIDATE_BOOLEAN, false );
//$onlyCenter = (bool)getFilteredParamOrDefault("onlyCenter", FILTER_VALIDATE_BOOLEAN, false);
$overpassConfig = new RoundRobinOverpassConfig($conf);
$enableDB = $conf->getBool("db-enable");
if ($enableDB)
    $db = new PostGIS_PDO($conf);

if ($from == "bbox") {
    $bboxMargin = $conf->has("bbox-margin") ? (float)$conf->get("bbox-margin") : 0;
    $minLat = (float)getFilteredParamOrError("minLat", FILTER_VALIDATE_FLOAT) - $bboxMargin;
    $minLon = (float)getFilteredParamOrError("minLon", FILTER_VALIDATE_FLOAT) - $bboxMargin;
    $maxLat = (float)getFilteredParamOrError("maxLat", FILTER_VALIDATE_FLOAT) + $bboxMargin;
    $maxLon = (float)getFilteredParamOrError("maxLon", FILTER_VALIDATE_FLOAT) + $bboxMargin;
    $bbox = new BaseBoundingBox($minLat, $minLon, $maxLat, $maxLon);
    $bboxArea = $bbox->getArea();
    //error_log("BBox area: $bboxArea");
    $maxArea = (float)$conf->get("elements-bbox-max-area");
    if ($bboxArea > $maxArea) {
        http_response_code(400);
        die('{"error":"The requested area is too large. Please use a smaller area."};');
    }

    if (empty($db)) {
        /*if($onlySkeleton) {
            $baseQuery = new BBoxEtymologySkeletonOverpassQuery(
                $bbox, $overpassEndpointURL
            );
        } elseif ($onlyCenter) {*/
        $baseQuery = new BBoxEtymologyCenterOverpassQuery($bbox, $overpassConfig);
        /*} else {
            $baseQuery = new BBoxEtymologyOverpassQuery($bbox,$overpassConfig);
        }*/
        $query = new CSVCachedBBoxGeoJSONQuery(
            $baseQuery,
            (string)$conf->get("cache-file-base-path"),
            $conf,
            $serverTiming
        );
    } else {
        $query = new BBoxEtymologyCenterPostGISQuery($bbox, $db, $serverTiming);
    }
} elseif ($from == "center") {
    $centerLat = (float)getFilteredParamOrError("centerLat", FILTER_VALIDATE_FLOAT);
    $centerLon = (float)getFilteredParamOrError("centerLon", FILTER_VALIDATE_FLOAT);
    $radius = (float)getFilteredParamOrError("radius", FILTER_VALIDATE_FLOAT);
    $query = new CenterEtymologyOverpassQuery(
        $centerLat,
        $centerLon,
        $radius,
        $overpassConfig
    );
} else {
    http_response_code(400);
    die('{"error":"You must specify either the BBox or center and radius"}');
}

$serverTiming->add("3_init");

$result = $query->send();
$serverTiming->add("4_query");
if (!$result->isSuccessful()) {
    http_response_code(500);
    error_log("Overpass error: " . $result);
    $out = '{"error":"Error getting result (overpass server error)"}';
} elseif (!$result->hasResult()) {
    http_response_code(500);
    error_log("Overpass no result: " . $result);
    $out = '{"error":"Error getting result (bad response)"}';
} elseif ($result->hasPublicSourcePath()) {
    if ($conf->getBool("redirect-to-cache-file")) {
        $out = "";
        header("Location: " . $result->getPublicSourcePath());
    } else {
        $out = $result->getGeoJSON();
        header("Cache-Location: " . $result->getPublicSourcePath());
    }
} else {
    $out = $result->getGeoJSON();
}

$serverTiming->add("5_output");
$serverTiming->sendHeader();
echo $out;
