<?php

declare(strict_types=1);
require_once(__DIR__ . "/funcs.php");

use \App\ServerTiming;

$serverTiming = new ServerTiming();

use \App\Config\IniEnvConfiguration;
use \App\BaseBoundingBox;
use App\Config\Wikidata\BaseWikidataConfig;
use \App\PostGIS_PDO;
use \App\Query\Overpass\BBoxEtymologyCenterOverpassQuery;
use \App\Query\PostGIS\BBoxEtymologyCenterPostGISQuery;
use \App\Query\Overpass\CenterEtymologyOverpassQuery;
use \App\Query\Caching\CSVCachedBBoxGeoJSONQuery;
use \App\Config\Overpass\RoundRobinOverpassConfig;
use App\Query\Wikidata\AllIndirectEtymologyWikidataQuery;
use App\Query\Wikidata\DirectEtymologyWikidataQuery;
use App\Query\Wikidata\ReverseEtymologyWikidataQuery;
use App\Query\Wikidata\QualifierEtymologyWikidataQuery;

$conf = new IniEnvConfiguration();
$serverTiming->add("1_readConfig");

prepareGeoJSON($conf);
$serverTiming->add("2_prepare");

$source = (string)getFilteredParamOrDefault("source", FILTER_SANITIZE_SPECIAL_CHARS, "all_db");
$from = (string)getFilteredParamOrError("from", FILTER_UNSAFE_RAW);
$search = (string)getFilteredParamOrDefault("search", FILTER_SANITIZE_SPECIAL_CHARS, null);

$enableDB = $conf->getBool("db_enable");
if ($enableDB && !in_array($source, ["overpass", "wd_direct", "wd_reverse", "wd_qualifier"])) {
    //error_log("elements.php using DB");
    $db = new PostGIS_PDO($conf);
} else {
    //error_log("elements.php NOT using DB");
    $db = null;
}
$textTag = (string)$conf->get('osm_text_key');
$descriptionTag = (string)$conf->get('osm_description_key');
$wikidataKeys = $conf->getWikidataKeys();
$wikidataKeyIDs = IniEnvConfiguration::keysToIDs($wikidataKeys);

if ($from == "bbox") {
    $maxArea = (float)$conf->get("elements_bbox_max_area");
    $bbox = BaseBoundingBox::fromInput(INPUT_GET, $maxArea);

    if ($db != null) {
        $query = new BBoxEtymologyCenterPostGISQuery($bbox, $db, $serverTiming, $source, $search);
    } else {
        $wikidataConfig = new BaseWikidataConfig($conf);
        if ($source == "wd_direct") {
            $wikidataProps = $conf->getArray("osm_wikidata_properties");
            $baseQuery = new DirectEtymologyWikidataQuery($bbox, $wikidataProps, $wikidataConfig);
        } elseif ($source == "wd_reverse") {
            $wikidataProperty = (string)$conf->get("wikidata_indirect_property");
            $baseQuery = new ReverseEtymologyWikidataQuery($bbox, $wikidataProperty, $wikidataConfig);
        } elseif ($source == "wd_qualifier") {
            $wikidataProperty = (string)$conf->get("wikidata_indirect_property");
            $baseQuery = new QualifierEtymologyWikidataQuery($bbox, $wikidataProperty, $wikidataConfig);
        } elseif ($source == "wd_indirect") {
            $wikidataProperty = (string)$conf->get("wikidata_indirect_property");
            $baseQuery = new AllIndirectEtymologyWikidataQuery($bbox, $wikidataProperty, $wikidataConfig);
        } elseif ($source == "overpass") {
            $overpassConfig = new RoundRobinOverpassConfig($conf);
            $baseQuery = new BBoxEtymologyCenterOverpassQuery($wikidataKeys, $bbox, $overpassConfig);
        } else {
            throw new Exception("Bad 'source' parameter");
        }
        $cacheFileBasePath = (string)$conf->get("cache_file_base_path");
        $cacheFileBaseURL = (string)$conf->get("cache_file_base_url");
        $cacheTimeoutHours = (int)$conf->get("overpass_cache_timeout_hours");
        $query = new CSVCachedBBoxGeoJSONQuery($baseQuery, $cacheFileBasePath, $serverTiming, $cacheTimeoutHours, $cacheFileBaseURL);
    }
} elseif ($from == "center") {
    $centerLat = (float)getFilteredParamOrError("centerLat", FILTER_VALIDATE_FLOAT);
    $centerLon = (float)getFilteredParamOrError("centerLon", FILTER_VALIDATE_FLOAT);
    $radius = (float)getFilteredParamOrError("radius", FILTER_VALIDATE_FLOAT);
    if ($db != null) {
        throw new Exception("Not yet implemented");
    } else {
        $overpassConfig = new RoundRobinOverpassConfig($conf);
        $query = new CenterEtymologyOverpassQuery($centerLat, $centerLon, $radius, $overpassConfig, $textTag, $descriptionTag, $wikidataKeys);
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
