<?php
require_once(__DIR__ . "/app/IniEnvConfiguration.php");
require_once(__DIR__ . "/app/PostGIS_PDO.php");
require_once(__DIR__ . "/funcs.php");

use \App\IniEnvConfiguration;
use \App\PostGIS_PDO;

$conf = new IniEnvConfiguration();

prepareCSV($conf);

if ($conf->getBool("db_enable")) {
    $db = new PostGIS_PDO($conf);
    $stm = $db->query(
        "SELECT wikidata_id, name, from_osm, from_wikidata, from_propagation
        FROM oem.v_dataset"
    );

    header('Content-Disposition: attachment; filename=open_etymology_map_dataset_'.date("Y-m-d").'.csv');  

    $output = fopen("php://output", "w");  
    fputcsv($output, array('wikidata_id','name','occurences','from_osm','from_wikidata','from_wikidata_parts','from_propagation'));  
    while($row = $stm->fetch())
        fputcsv($output, $row);
    fclose($output);  
} else { // The dataset is not available without the DB
    throw new Exception("No DB, can't export to dataset");
}
