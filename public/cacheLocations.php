<?php
require_once(__DIR__ . "/../app/ServerTiming.php");

use \App\ServerTiming;

$serverTiming = new ServerTiming();

require_once(__DIR__ . "/../app/IniEnvConfiguration.php");
require_once(__DIR__ . "/../app/query/caching/CSVCachedBBoxQuery.php");
require_once("./funcs.php");
$serverTiming->add("0_include");

use \App\IniEnvConfiguration;

$conf = new IniEnvConfiguration();
$serverTiming->add("1_readConfig");

if($conf->getDbEnable()) {
    http_response_code(400);
    die("<html><body>The system is using the DB, not Overpass cache</body></html>");
}

prepareJSON($conf);
$serverTiming->add("2_prepare");

// it_App_Query_Combined_BBoxEtymologyOverpassWikidataQuery_cache.csv

$cacheFileBasePath = (string)$conf->get("cache_file_base_path");
$geoJsonOut = [
    "type" => "FeatureCollection",
    "features" => []
];

$files = array_merge(
    [$cacheFileBasePath . "BBoxEtymologyCenterOverpassQuery_cache.csv"],
    //glob($cacheFileBasePath . "*_BBoxGeoJSONEtymologyQuery_CachedEtymologyIDListWikidataFactory_cache.csv"),
);
foreach ($files as $filePath) {
    $file = @fopen($filePath, "r");
    if($file === false) {
        error_log("Failed opening $filePath");
    } else {
        while (($row = fgetcsv($file)) !== false) {
            $geoJsonOut["features"][] = [
                "type" => "Feature",
                "properties" => ["fill" => "white", "stroke" => "red", "fill-opacity" => 0.3],
                "geometry" => [
                    "type" => "Polygon",
                    "coordinates" => [[[
                        (float)$row[BBOX_CACHE_COLUMN_MIN_LON],
                        (float)$row[BBOX_CACHE_COLUMN_MIN_LAT]
                    ], [
                        (float)$row[BBOX_CACHE_COLUMN_MIN_LON],
                        (float)$row[BBOX_CACHE_COLUMN_MAX_LAT]
                    ], [
                        (float)$row[BBOX_CACHE_COLUMN_MAX_LON],
                        (float)$row[BBOX_CACHE_COLUMN_MAX_LAT]
                    ], [
                        (float)$row[BBOX_CACHE_COLUMN_MAX_LON],
                        (float)$row[BBOX_CACHE_COLUMN_MIN_LAT]
                    ], [
                        (float)$row[BBOX_CACHE_COLUMN_MIN_LON],
                        (float)$row[BBOX_CACHE_COLUMN_MIN_LAT]
                    ]]],
                ],
            ];
        }
    }
}

header('Content-Disposition: attachment; filename="cacheLocations.geojson"');
echo json_encode($geoJsonOut);
