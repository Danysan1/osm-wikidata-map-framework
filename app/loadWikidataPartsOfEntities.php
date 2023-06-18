<?php

declare(strict_types=1);
require_once(__DIR__ . "/loadWikidataRelatedEntities.php");

use \App\Config\IniEnvConfiguration;
use App\Config\Wikidata\BaseWikidataConfig;
use \App\PostGIS_PDO;

$conf = new IniEnvConfiguration();
$dbh = new PostGIS_PDO($conf);
$config = new BaseWikidataConfig($conf);

App\loadWikidataRelatedEntities(
    "owmf.etymology JOIN owmf.wikidata ON wd_id = et_wd_id",
    "wd_wikidata_cod",
    "et_from_parts_of_wd_id IS NULL",
    "et_el_id, et_wd_id, et_from_el_id, et_from_osm, et_from_key_ids, et_from_osm_wikidata_wd_id, et_from_osm_wikidata_prop_cod, et_recursion_depth, et_from_parts_of_wd_id",
    "et_el_id, w2.wd_id, et_from_el_id, et_from_osm, et_from_key_ids, et_from_osm_wikidata_wd_id, et_from_osm_wikidata_prop_cod, et_recursion_depth, w1.wd_id",
    "JOIN owmf.etymology ON et_wd_id = w1.wd_id",
    "has_parts",
    ["P527"], // has part or parts
    [ // https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/CONTRIBUTING.md#how-to-contribute-to-the-etymology-data
        "Q16979650", "Q14073567", "Q58603552", // sibling group / duo / trio
        "Q10648343", "Q16145172", "Q1826687", "Q99241914", // duo / trio / quartet / quintet
        "Q16334295", // group of humans
        "Q219160", // couple
        "Q3046146", // married couple
        "Q1141470", // double act
        "Q14756018", // twins
    ],
    false,
    $dbh,
    $config
);
