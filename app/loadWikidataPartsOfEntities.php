<?php

declare(strict_types=1);
require_once(__DIR__ . "/loadWikidataRelatedEntities.php");

use \App\Config\IniEnvConfiguration;
use \App\PostGIS_PDO;

$conf = new IniEnvConfiguration();
$dbh = new PostGIS_PDO($conf);
$wikidataEndpointURL = (string)$conf->get("wikidata_endpoint");
$availableSourceKeyIDs = IniEnvConfiguration::keysToIDs($conf->getWikidataKeys());
$fromOsmColumns = implode(", ", array_map(function (string $id): string {
    return "et_from_$id";
}, $availableSourceKeyIDs));

App\loadWikidataPartsOfEntities($dbh, $wikidataEndpointURL, $fromOsmColumns);
