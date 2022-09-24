<?php
require_once(__DIR__."/funcs.php");
require_once(__DIR__."/app/IniEnvConfiguration.php");
require_once(__DIR__."/app/PostGIS_PDO.php");
require_once(__DIR__."/app/loadWikidataRelatedEntities.php");

use App\IniEnvConfiguration;
use App\PostGIS_PDO;

$conf = new IniEnvConfiguration();
prepareText($conf);

$dbh = new PostGIS_PDO($conf);
$wikidataEndpointURL = (string)$conf->get("wikidata_endpoint");
App\loadWikidataConsistsOfEntities($dbh, $wikidataEndpointURL);
