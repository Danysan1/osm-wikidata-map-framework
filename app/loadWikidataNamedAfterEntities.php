<?php

declare(strict_types=1);
require_once(__DIR__ . "/loadWikidataRelatedEntities.php");

use \App\Config\IniEnvConfiguration;
use \App\PostGIS_PDO;

$conf = new IniEnvConfiguration();
$dbh = new PostGIS_PDO($conf);
$wikidataEndpointURL = (string)$conf->get("wikidata_endpoint");
$wikidataProperties = array_map(function (mixed $x) {
    return (string)$x;
}, $conf->getArray('osm_wikidata_properties'));

error_log("Wikidata endpoint: $wikidataEndpointURL");
error_log("Wikidata properties: " . implode(", ", $wikidataProperties));

App\loadWikidataNamedAfterEntities($dbh, $wikidataEndpointURL, $wikidataProperties);
