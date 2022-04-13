<?php
require_once("./app/ServerTiming.php");

use \App\ServerTiming;

$serverTiming = new ServerTiming();

require_once("./app/IniEnvConfiguration.php");
require_once("./app/query/cache/CSVCachedBBoxQuery.php");
require_once("./funcs.php");
$serverTiming->add("0_include");

use \App\IniEnvConfiguration;

$conf = new IniEnvConfiguration();
$serverTiming->add("1_readConfig");

prepareJSON($conf);
$serverTiming->add("2_prepare");

// it_App_Query_Combined_BBoxEtymologyOverpassWikidataQuery_cache.csv

$cacheFileBasePath = (string)$conf->get("cache-file-base-path");
$geoJsonOut = [
    "type" => "FeatureCollection",
    "features" => []
];

$files = array_merge(
    [$cacheFileBasePath . "BBoxEtymologyCenterOverpassQuery_cache.csv"],
    //glob($cacheFileBasePath . "*_BBoxGeoJSONEtymologyQuery_CachedEtymologyIDListWikidataFactory_cache.csv"),
);
foreach ($files as $filePath) {
    $file = fopen($filePath, "r");
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

header('Content-Disposition: attachment; filename="cacheLocations.json"');
echo json_encode($geoJsonOut);
