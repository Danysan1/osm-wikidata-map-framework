<?php
require_once(__DIR__ . "/../app/ServerTiming.php");

use \App\ServerTiming;

$serverTiming = new ServerTiming();

require_once(__DIR__ . "/../app/config/IniEnvConfiguration.php");
require_once(__DIR__ . "/../app/BaseBoundingBox.php");
require_once(__DIR__ . "/../app/PostGIS_PDO.php");
require_once(__DIR__ . "/../app/query/overpass/CenterEtymologyOverpassQuery.php");
require_once(__DIR__ . "/../app/query/overpass/BBoxEtymologyOverpassQuery.php");
require_once(__DIR__ . "/../app/query/overpass/BBoxEtymologyCenterOverpassQuery.php");
require_once(__DIR__ . "/../app/query/postgis/BBoxEtymologyCenterPostGISQuery.php");
require_once(__DIR__ . "/../app/query/overpass/RoundRobinOverpassConfig.php");
require_once(__DIR__ . "/../app/query/caching/CSVCachedBBoxGeoJSONQuery.php");
require_once("./funcs.php");
$serverTiming->add("0_include");

use \App\IniEnvConfiguration;
use \App\BaseBoundingBox;
use App\PostGIS_PDO;
use App\Query\Overpass\BBoxEtymologyCenterOverpassQuery;
use App\Query\PostGIS\BBoxEtymologyCenterPostGISQuery;
use App\Query\Overpass\CenterEtymologyOverpassQuery;
use App\Query\Caching\CSVCachedBBoxGeoJSONQuery;
use App\Query\Overpass\RoundRobinOverpassConfig;

$conf = new IniEnvConfiguration();
$serverTiming->add("1_readConfig");

prepareGeoJSON($conf);
$serverTiming->add("2_prepare");

$source = (string)getFilteredParamOrDefault("source", FILTER_SANITIZE_SPECIAL_CHARS, "all");
$from = (string)getFilteredParamOrError("from", FILTER_UNSAFE_RAW);
$subject = (string)getFilteredParamOrDefault("subject", FILTER_SANITIZE_SPECIAL_CHARS, null);
$overpassConfig = new RoundRobinOverpassConfig($conf);

$enableDB = $conf->getDbEnable();
if ($enableDB) {
    //error_log("elements.php using DB");
    $db = new PostGIS_PDO($conf);
} else {
    //error_log("elements.php NOT using DB");
    $db = null;
}

if ($from == "bbox") {
    $maxArea = (float)$conf->get("elements_bbox_max_area");
    $bbox = BaseBoundingBox::fromInput(INPUT_GET, $maxArea);

    if ($db != null) {
        $query = new BBoxEtymologyCenterPostGISQuery($bbox, $db, $serverTiming, $source, $subject);
    } else {
        $baseQuery = new BBoxEtymologyCenterOverpassQuery($bbox, $overpassConfig);
        $query = new CSVCachedBBoxGeoJSONQuery(
            $baseQuery,
            (string)$conf->get("cache_file_base_path"),
            $conf,
            $serverTiming
        );
    }
} elseif ($from == "center") {
    $centerLat = (float)getFilteredParamOrError("centerLat", FILTER_VALIDATE_FLOAT);
    $centerLon = (float)getFilteredParamOrError("centerLon", FILTER_VALIDATE_FLOAT);
    $radius = (float)getFilteredParamOrError("radius", FILTER_VALIDATE_FLOAT);
    if ($db != null) {
        throw new Exception("Not yet implemented");
    } else {
        $query = new CenterEtymologyOverpassQuery(
            $centerLat,
            $centerLon,
            $radius,
            $overpassConfig
        );
    }
} else {
    http_response_code(400);
    die('{"error":"You must specify either the BBox or center and radius"}');
}

$serverTiming->add("3_init");

$result = $query->sendAndGetGeoJSONResult();
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
    if ($conf->getBool("redirect_to_cache_file")) {
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
