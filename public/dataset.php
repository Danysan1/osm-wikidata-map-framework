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

$fields = implode(",", [
    'wikidata_id', 'element_name', 'count_osm', 'count_osm_wikidata', 'count_wikidata', 'count_part_of', 'count_propagation'
]); // All fields are DB columns and contain no spaces or commas, no escaping necessary
$stm = $db->query("SELECT $fields FROM oem.vm_dataset");

header("Content-Disposition: attachment; filename=dataset_$lastUpdate.csv");

$output = fopen("php://output", "w");
fputs($output, $fields . PHP_EOL);
while (
    /** @var Stringable[]|false $row */
    $row = $stm->fetch()
)
    fputcsv($output, $row);
fclose($output);
