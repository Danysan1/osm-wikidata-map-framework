<?php

declare(strict_types=1);
require_once(__DIR__ . "/loadWikidataRelatedEntities.php");

use \App\Config\IniEnvConfiguration;
use App\Config\Wikidata\BaseWikidataConfig;
use \App\PostGIS_PDO;

$conf = new IniEnvConfiguration();
$dbh = new PostGIS_PDO($conf);
$config = new BaseWikidataConfig($conf);
$wikidataProperties = array_map(function (mixed $x) {
    return (string)$x;
}, $conf->getArray('osm_wikidata_properties'));

error_log("Wikidata properties: " . implode(", ", $wikidataProperties));

App\loadWikidataNamedAfterEntities($dbh, $config, $wikidataProperties);
