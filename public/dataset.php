<?php
require_once(__DIR__ . "/../app/IniEnvConfiguration.php");
require_once(__DIR__ . "/../app/PostGIS_PDO.php");
require_once(__DIR__ . "/funcs.php");

use \App\IniEnvConfiguration;
use \App\PostGIS_PDO;

$conf = new IniEnvConfiguration();

prepareCSV($conf);

if (!$conf->getDbEnable()) { // The dataset is not available without the DB
    throw new Exception("No DB, can't export to dataset");
}

$db = new PostGIS_PDO($conf);
try {
    $lastUpdate = (string)$db->query("SELECT oem.last_data_update()")->fetchColumn();
} catch (Exception $e) {
    $lastUpdate = date("Y-m-d");
}
$stm = $db->query(
    'SELECT
        wd.wd_wikidata_cod AS "wikidata_id",
        ele.el_tags->>\'name\' AS "name",
        COUNT(*) FILTER (WHERE ety.et_recursion_depth = 0 AND ety.et_from_parts_of_wd_id IS NULL AND ety.et_from_osm_etymology) AS "osm_etymology",
        COUNT(*) FILTER (WHERE ety.et_recursion_depth = 0 AND ety.et_from_parts_of_wd_id IS NULL AND ety.et_from_osm_subject) AS "osm_subject",
        COUNT(*) FILTER (WHERE ety.et_recursion_depth = 0 AND ety.et_from_parts_of_wd_id IS NULL AND ety.et_from_osm_buried) AS "osm_buried",
        COUNT(*) FILTER (WHERE ety.et_recursion_depth = 0 AND ety.et_from_parts_of_wd_id IS NULL AND ety.et_from_wikidata_wd_id IS NOT NULL) AS "wikidata",
        COUNT(*) FILTER (WHERE ety.et_recursion_depth = 0 AND ety.et_from_parts_of_wd_id IS NOT NULL) AS "part_of",
        COUNT(*) FILTER (WHERE ety.et_recursion_depth != 0) AS "propagation"
    FROM oem.etymology AS ety
    JOIN oem.wikidata AS wd ON wd.wd_id = ety.et_wd_id
    JOIN oem.element AS ele ON ele.el_id = ety.et_el_id
    GROUP BY wd.wd_id, ele.el_tags->>\'name\'
    ORDER BY LENGTH(wd.wd_wikidata_cod), wd.wd_wikidata_cod, ele.el_tags->>\'name\''
);

header("Content-Disposition: attachment; filename=open_etymology_map_dataset_$lastUpdate.csv");

$output = fopen("php://output", "w");
fputcsv($output, array(
    'wikidata_id', 'name', 'from_osm_etymology', 'from_osm_subject', 'from_osm_buried', 'from_wikidata', 'from_part_of', 'from_propagation'
));
while ($row = $stm->fetch())
    fputcsv($output, $row);
fclose($output);
