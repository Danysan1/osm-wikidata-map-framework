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

App\loadWikidataRelatedEntities(
    "oem.element_wikidata_cods",
    "ew_wikidata_cod",
    "NOT ew_from_osm",
    "et_el_id, et_wd_id, et_from_el_id, et_from_osm, et_from_key_ids, et_from_osm_wikidata_wd_id, et_from_osm_wikidata_prop_cod",
    "ew_el_id, w2.wd_id, ew_el_id, FALSE, ARRAY['osm_wikidata_direct'], w1.wd_id, REPLACE(value->'prop'->>'value', 'http://www.wikidata.org/prop/', '')",
    "JOIN oem.element_wikidata_cods ON ew_wikidata_cod = w1.wd_wikidata_cod",
    "wikidata_direct",
    $wikidataProperties,
    null,
    false,
    $dbh,
    $config
);
