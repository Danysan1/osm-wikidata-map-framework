<?php
require_once("./Configuration.php");
require_once("./WikidataQuery.php");
require_once("./WikidataResult.php");
require_once("./funcs.php");
$conf = new Configuration();
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

$wikidataQuery = WikidataQuery::FromIDList($wikidataIDs, $lang);
$endpoint = (string)$conf->get('wikidata-endpoint');
$result = $wikidataQuery->send($endpoint);
if(!$result->isSuccessful()) {
    http_response_code(500);
    $result->errorLogResponse("Wikidata");
    die('{"error":"Error getting result (wikidata server error)"}');
} elseif (!$result->hasData() || !$result->isXML()) {
    http_response_code(500);
    $result->errorLogResponse("Wikidata");
    die('{"error":"Error getting result (bad response)"}');
} else {
    //echo json_encode((array)($result->parseXMLBody()->results->result));
    //echo json_encode($result->parseXMLBodyToObject()["results"]["result"]);
    echo json_encode($result->toMatrix());
}




