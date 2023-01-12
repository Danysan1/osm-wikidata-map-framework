<?php
if (php_sapi_name() != "cli") {
    http_response_code(400);
    die("Only runnable through CLI");
}

require_once(__DIR__ . "/IniEnvConfiguration.php");
require_once(__DIR__ . "/PostGIS_PDO.php");
require_once(__DIR__ . "/loadWikidataRelatedEntities.php");

use App\IniEnvConfiguration;
use App\PostGIS_PDO;

$conf = new IniEnvConfiguration();
$dbh = new PostGIS_PDO($conf);
$wikidataEndpointURL = (string)$conf->get("wikidata_endpoint");
App\loadWikidataNamedAfterEntities($dbh, $wikidataEndpointURL);
