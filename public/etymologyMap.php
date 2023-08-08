<?php

declare(strict_types=1);
require_once(__DIR__ . "/funcs.php");

use \App\ServerTiming;

$serverTiming = new ServerTiming();

use \App\Config\IniEnvConfiguration;
use \App\BaseBoundingBox;
use \App\PostGIS_PDO;
use \App\Query\Caching\CSVCachedBBoxGeoJSONQuery;
use \App\Query\Combined\BBoxGeoJSONEtymologyQuery;
use App\Query\Overpass\BBoxEtymologyOverpassQuery;
use \App\Query\Wikidata\CachedEtymologyIDListWikidataFactory;
use \App\Config\Overpass\RoundRobinOverpassConfig;
use App\Config\Wikidata\BaseWikidataConfig;
use \App\Query\PostGIS\BBoxEtymologyPostGISQuery;
use App\Query\Wikidata\AllIndirectEtymologyWikidataQuery;
use App\Query\Wikidata\DirectEtymologyWikidataQuery;
use App\Query\Wikidata\ReverseEtymologyWikidataQuery;
use App\Query\Wikidata\QualifierEtymologyWikidataQuery;

$conf = new IniEnvConfiguration();
$serverTiming->add("1_readConfig");

prepareGeoJSON($conf);
$serverTiming->add("2_prepare");

$maxArea = (float)$conf->get("wikidata_bbox_max_area");
$bbox = BaseBoundingBox::fromInput(INPUT_GET, $maxArea);

$downloadColors = (bool)getFilteredParamOrDefault("download_colors", FILTER_VALIDATE_BOOL, false);
$source = (string)getFilteredParamOrDefault("source", FILTER_SANITIZE_SPECIAL_CHARS, "overpass_all");

$defaultLanguage = (string)$conf->get('default_language');
$safeLanguage = getSafeLanguage($defaultLanguage);
$search = (string)getFilteredParamOrDefault("search", FILTER_SANITIZE_SPECIAL_CHARS, null);

$wikidataConfig = new BaseWikidataConfig($conf);
$maxElements = $conf->has("max_map_elements") ? (int)$conf->get("max_map_elements") : null;
if ($maxElements !== null && $maxElements <= 0) {
    throw new Exception("The max_map_elements configuration must be > 0 or empty");
}
$eagerFullDownload = $conf->getBool("eager_full_etymology_download");

$enableDB = $conf->getBool("db_enable");
if ($enableDB && str_starts_with($source, "db_")) {
    //error_log("etymologyMap.php using DB");
    $db = new PostGIS_PDO($conf);
} else {
    //error_log("etymologyMap.php NOT using DB");
    $db = null;
}
$textKey = $conf->has('osm_text_key') ? (string)$conf->get('osm_text_key') : null;
$descriptionKey = $conf->has('osm_description_key') ? (string)$conf->get('osm_description_key') : null;

if ($db != null) {
    $query = new BBoxEtymologyPostGISQuery(
        $bbox,
        $db,
        $wikidataConfig,
        $textKey,
        $descriptionKey,
        $defaultLanguage,
        $safeLanguage,
        $serverTiming,
        $maxElements,
        $source,
        $search,
        $downloadColors,
        $eagerFullDownload
    );
} else {
    $cacheFileBasePath = (string)$conf->get("cache_file_base_path");
    $cacheFileBaseURL = (string)$conf->get("cache_file_base_url");
    $overpassCacheTimeoutHours = (int)$conf->get("overpass_cache_timeout_hours");
    $wikidataCacheTimeoutHours = (int)$conf->get("wikidata_cache_timeout_hours");
    $imageProperty = $conf->has("wikidata_image_property") ? (string)$conf->get("wikidata_image_property") : null;

    if ($source == "wd_direct") {
        $wikidataProps = $conf->getArray("osm_wikidata_properties");
        $baseQuery = new DirectEtymologyWikidataQuery($bbox, $wikidataProps, $wikidataConfig, $defaultLanguage, $safeLanguage);
    } elseif ($source == "wd_reverse") {
        $wikidataProperty = (string)$conf->get("wikidata_indirect_property");
        $baseQuery = new ReverseEtymologyWikidataQuery($bbox, $wikidataProperty, $wikidataConfig, $defaultLanguage, $safeLanguage);
    } elseif ($source == "wd_qualifier") {
        $wikidataProperty = (string)$conf->get("wikidata_indirect_property");
        $baseQuery = new QualifierEtymologyWikidataQuery($bbox, $wikidataProperty, $wikidataConfig, $imageProperty);
    } elseif ($source == "wd_indirect") {
        $wikidataProperty = (string)$conf->get("wikidata_indirect_property");
        $baseQuery = new AllIndirectEtymologyWikidataQuery($bbox, $wikidataProperty, $wikidataConfig, $imageProperty, $defaultLanguage, $safeLanguage);
    } elseif (str_starts_with($source, "overpass_")) {
        $overpassConfig = new RoundRobinOverpassConfig($conf);
        $keyID = str_replace("overpass_", "", $source);
        $wikidataKeys = $conf->getWikidataKeys($keyID);
        $baseQuery = new BBoxEtymologyOverpassQuery($wikidataKeys, $bbox, $overpassConfig, $textKey, $descriptionKey, $defaultLanguage, $safeLanguage);
    } else {
        throw new Exception("Bad 'source' parameter");
    }

    if ($downloadColors || $eagerFullDownload) {
        $wikidataFactory = new CachedEtymologyIDListWikidataFactory($safeLanguage, $wikidataConfig, $cacheFileBasePath, $cacheFileBaseURL, $wikidataCacheTimeoutHours, $eagerFullDownload, $serverTiming);
        $baseQuery = new BBoxGeoJSONEtymologyQuery($baseQuery, $wikidataFactory, $serverTiming);
    }
    $query = new CSVCachedBBoxGeoJSONQuery($baseQuery, $cacheFileBasePath, $serverTiming, $overpassCacheTimeoutHours, $cacheFileBaseURL);
}

$serverTiming->add("3_init");

$result = $query->sendAndGetGeoJSONResult();
$serverTiming->add("4_query");
if (!$result->isSuccessful()) {
    http_response_code(500);
    error_log("Query error: " . $result);
    $out = '{"error":"Error getting result (overpass/wikidata server error)"}';
} elseif (!$result->hasResult()) {
    http_response_code(500);
    error_log("Query no result: " . $result);
    $out = '{"error":"Error getting result (bad response)"}';
} else {
    $out = $result->getGeoJSON();
    if ($result->hasPublicSourcePath())
        header("Cache-Location: " . $result->getPublicSourcePath());
}

$serverTiming->add("5_output");
$serverTiming->sendHeader();
echo $out;
