<?php

declare(strict_types=1);
require_once(__DIR__ . "/funcs.php");

use \App\Config\IniEnvConfiguration;
use \App\PostGIS_PDO;

$conf = new IniEnvConfiguration();

prepareGeoJSON($conf);

if ($conf->getBool("db_enable")) {
    $db = new PostGIS_PDO($conf);
    echo (string)$db->query(
        "SELECT JSON_BUILD_OBJECT(
            'type', 'FeatureCollection',
            'features', JSON_AGG(ST_AsGeoJSON(vm_global_map.*)::json)
        )
        FROM oem.vm_global_map"
    )->fetchColumn();
} else {
    http_response_code(406);
    echo '{"error":"The global map is not available without the DB. Please zoom in or use the DB."}';
}
