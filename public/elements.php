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

$source = (string)getFilteredParamOrDefault("source", FILTER_SANITIZE_SPECIAL_CHARS, "overpass_all");
$search = (string)getFilteredParamOrDefault("search", FILTER_SANITIZE_SPECIAL_CHARS, null);

$enableDB = $conf->getBool("db_enable");
if ($enableDB && str_starts_with($source, "db_")) {
    //error_log("elements.php using DB");
    $db = new PostGIS_PDO($conf);
} else {
    //error_log("elements.php NOT using DB");
    $db = null;
}

$maxArea = (float)$conf->get("elements_bbox_max_area");
$bbox = BaseBoundingBox::fromInput(INPUT_GET, $maxArea);

if ($db != null) {
    $query = new BBoxEtymologyCenterPostGISQuery($bbox, $db, $serverTiming, $source, $search);
} else {
    $wikidataConfig = new BaseWikidataConfig($conf);
    $defaultLanguage = (string)$conf->get('default_language');
    $imageProperty = $conf->has("wikidata_image_property") ? (string)$conf->get("wikidata_image_property") : null;

    if ($source == "wd_direct") {
        $wikidataProps = $conf->getArray("osm_wikidata_properties");
        $baseQuery = new DirectEtymologyWikidataQuery($bbox, $wikidataProps, $wikidataConfig, $defaultLanguage);
    } elseif ($source == "wd_reverse") {
        $wikidataProperty = (string)$conf->get("wikidata_indirect_property");
        $baseQuery = new ReverseEtymologyWikidataQuery($bbox, $wikidataProperty, $wikidataConfig, $defaultLanguage);
    } elseif ($source == "wd_qualifier") {
        $wikidataProperty = (string)$conf->get("wikidata_indirect_property");
        $baseQuery = new QualifierEtymologyWikidataQuery($bbox, $wikidataProperty, $wikidataConfig, $imageProperty);
    } elseif ($source == "wd_indirect") {
        $wikidataProperty = (string)$conf->get("wikidata_indirect_property");
        $baseQuery = new AllIndirectEtymologyWikidataQuery($bbox, $wikidataProperty, $wikidataConfig, $imageProperty, $defaultLanguage);
    } elseif (str_starts_with($source, "overpass_")) {
        $overpassConfig = new RoundRobinOverpassConfig($conf);
        $keyID = str_replace("overpass_", "", $source);
        $wikidataKeys = $conf->getWikidataKeys($keyID);
        $baseQuery = new BBoxEtymologyCenterOverpassQuery($wikidataKeys, $bbox, $overpassConfig);
    } else {
        throw new Exception("Bad 'source' parameter");
    }
    $cacheFileBasePath = (string)$conf->get("cache_file_base_path");
    $cacheFileBaseURL = (string)$conf->get("cache_file_base_url");
    $cacheTimeoutHours = (int)$conf->get("overpass_cache_timeout_hours");
    $query = new CSVCachedBBoxGeoJSONQuery($baseQuery, $cacheFileBasePath, $serverTiming, $cacheTimeoutHours, $cacheFileBaseURL);
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
} else {
    $out = $result->getGeoJSON();
    if ($result->hasPublicSourcePath())
        header("Cache-Location: " . $result->getPublicSourcePath());
}

$serverTiming->add("5_output");
$serverTiming->sendHeader();
echo $out;
