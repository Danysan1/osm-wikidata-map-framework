<?php
require_once("./app/IniFileConfiguration.php");
require_once("./app/BaseStringSet.php");
require_once("./app/query/wikidata/EtymologyIDListWikidataQuery.php");
require_once("./app/query/decorators/CachedStringSetXMLQuery.php");
require_once("./funcs.php");

use \App\BaseStringSet;
use \App\IniFileConfiguration;
use App\Query\Decorators\CachedStringSetXMLQuery;
use \App\Query\Wikidata\EtymologyIDListWikidataQuery;

$conf = new IniFileConfiguration();
prepareJSON($conf);

if(!isset($_GET["wikidataIDs"]) || !is_array($_GET["wikidataIDs"])) {
    http_response_code(400);
    die(json_encode(array("error" => "No wikidataIDs array given")));
}
$wikidataIDs = new BaseStringSet($_GET["wikidataIDs"]);

$lang = (string)getFilteredParamOrDefault( "lang", FILTER_SANITIZE_STRING, $conf->get("default-language") );
$cacheFileBasePath = (string)$conf->get("cache-file-base-path");
$cacheTimeoutHours = (int)$conf->get("cache-timeout-hours");

// "en-US" => "en"
$langMatches = [];
if (!preg_match('/^([a-z]{2})(-[A-Z]{2})?$/', $lang, $langMatches) || empty($langMatches[1])) {
    throw new Exception("Invalid language code");
}
$safeLang = $langMatches[1];

$wikidataEndpointURL = (string)$conf->get('wikidata-endpoint');
$wikidataQuery = new EtymologyIDListWikidataQuery($wikidataIDs, $safeLang, $wikidataEndpointURL);
$cachedQuery = new CachedStringSetXMLQuery($wikidataQuery, $query, $cacheFileBasePath . $safeLang . "_", $cacheTimeoutHours);
$result = $wikidataQuery->send();
if(!$result->isSuccessful()) {
    http_response_code(500);
    error_log("Wikidata error: ".$result);
    die('{"error":"Error getting result (wikidata server error)"}');
} elseif (!$result->hasResult()) {
    http_response_code(500);
    error_log("Wikidata no result: ".$result);
    die('{"error":"Error getting result (bad response)"}');
} else {
    echo json_encode($result->getMatrixData());
}




