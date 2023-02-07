<?php
require_once(__DIR__ . "/../app/config/IniEnvConfiguration.php");
require_once(__DIR__ . "/../app/PostGIS_PDO.php");
require_once(__DIR__ . "/funcs.php");

use \App\IniEnvConfiguration;
use \App\PostGIS_PDO;

$conf = new IniEnvConfiguration();

prepareGeoJSON($conf);

if ($conf->getDbEnable()) {
    $db = new PostGIS_PDO($conf);
    echo (string)$db->query(
        "SELECT JSON_BUILD_OBJECT(
            'type', 'FeatureCollection',
            'features', JSON_AGG(ST_AsGeoJSON(vm_global_map.*)::json)
        )
        FROM oem.vm_global_map"
    )->fetchColumn();
} else { // The global map is not available without the DB
    echo '{"type":"FeatureCollection", "features":[]}';
}
