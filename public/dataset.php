<?php

declare(strict_types=1);
require_once(__DIR__ . "/funcs.php");

use \App\Config\IniEnvConfiguration;
use \App\PostGIS_PDO;

$conf = new IniEnvConfiguration();

prepareCSV($conf);

if (!$conf->getBool("db_enable")) { // The dataset is not available without the DB
    throw new Exception("No DB, can't export to dataset");
}

$db = new PostGIS_PDO($conf);
try {
    $lastUpdate = (string)$db->query("SELECT oem.last_data_update()")->fetchColumn();
} catch (Exception $e) {
    $lastUpdate = date("Y-m-d");
}

$wikidataKeyIDs = IniEnvConfiguration::keysToIDs($conf->getWikidataKeys());
$fromOsmColumnValues = implode(" ", array_map(function (string $keyID): string {
    return "COUNT(*) FILTER (WHERE ety.et_recursion_depth = 0 AND ety.et_from_parts_of_wd_id IS NULL AND '$keyID' = ANY(ety.et_from_key_ids)) AS \"$keyID\",";
}, $wikidataKeyIDs));
$stm = $db->query(
    "SELECT
        wd.wd_wikidata_cod AS \"wikidata_id\",
        ele.el_tags->>'name' AS \"name\",
        $fromOsmColumnValues
        COUNT(*) FILTER (WHERE ety.et_recursion_depth = 0 AND ety.et_from_parts_of_wd_id IS NULL AND ety.et_from_osm_wikidata_wd_id IS NOT NULL) AS \"wikidata\",
        COUNT(*) FILTER (WHERE ety.et_recursion_depth = 0 AND ety.et_from_parts_of_wd_id IS NOT NULL) AS \"part_of\",
        COUNT(*) FILTER (WHERE ety.et_recursion_depth != 0) AS \"propagation\"
    FROM oem.etymology AS ety
    JOIN oem.wikidata AS wd ON wd.wd_id = ety.et_wd_id
    JOIN oem.element AS ele ON ele.el_id = ety.et_el_id
    GROUP BY wd.wd_id, ele.el_tags->>'name'
    ORDER BY LENGTH(wd.wd_wikidata_cod), wd.wd_wikidata_cod, ele.el_tags->>'name'"
);

header("Content-Disposition: attachment; filename=dataset_$lastUpdate.csv");

$output = fopen("php://output", "w");
fputcsv($output, array_merge( # Print column names
    ['wikidata_id', 'name'],
    $wikidataKeyIDs,
    ['osm_wikidata', 'part_of', 'propagation']
));
while (
    /** @var Stringable[]|false $row */
    $row = $stm->fetch()
)
    fputcsv($output, $row);
fclose($output);
