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
}, $conf->getArray("wikidata_properties"));
App\loadWikidataNamedAfterEntities($dbh, $wikidataEndpointURL, $wikidataProperties);
