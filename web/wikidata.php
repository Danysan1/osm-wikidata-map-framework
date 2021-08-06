<?php
require_once("./app/IniFileConfiguration.php");
require_once("./app/EtymologyIDListWikidataQuery.php");
require_once("./funcs.php");
$conf = new IniFileConfiguration();
prepareJSON($conf);

if(!isset($_GET["wikidataIDs"]) || !is_array($_GET["wikidataIDs"])) {
    http_response_code(400);
    die(json_encode(array("error" => "No wikidataIDs array given")));
}
$wikidataIDs = $_GET["wikidataIDs"];

$lang = (string)getFilteredParamOrDefault( "lang", FILTER_SANITIZE_STRING, $conf->get("default-language") );

$wikidataEndpointURL = (string)$conf->get('wikidata-endpoint');
$wikidataQuery = new EtymologyIDListWikidataQuery($wikidataIDs, $lang, $wikidataEndpointURL);
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




