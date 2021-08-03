<?php
require_once("./IniFileConfiguration.php");
require_once("./EtymologyIDListWikidataQuery.php");
require_once("./WikidataQueryResult.php");
require_once("./funcs.php");
$conf = new IniFileConfiguration();
prepareJSON($conf);

if(!isset($_GET["wikidataIDs"]) || !is_array($_GET["wikidataIDs"])) {
    http_response_code(400);
    die(json_encode(array("error" => "No wikidataIDs array given")));
}
$wikidataIDs = $_GET["wikidataIDs"];
foreach($wikidataIDs as $wdID) {
    if(!is_string($wdID) || !preg_match("/^Q[0-9]+$/", $wdID)) {
        http_response_code(400);
        die(json_encode(array("error" => "All Wikidata IDs must be valid strings")));
    }
}

$lang = (string)getFilteredParamOrDefault( "lang", FILTER_SANITIZE_STRING, $conf->get("default-language") );

$wikidataQuery = new EtymologyIDListWikidataQuery($wikidataIDs, $lang);
$endpoint = (string)$conf->get('wikidata-endpoint');
$result = $wikidataQuery->send($endpoint);
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




