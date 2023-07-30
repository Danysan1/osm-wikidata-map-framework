<?php

declare(strict_types=1);
require_once(__DIR__ . "/funcs.php");

use \App\Config\IniEnvConfiguration;
use \App\PostGIS_PDO;

$conf = new IniEnvConfiguration();

prepareHTML($conf);
header("Cache-Control: no-cache", true);

if (!$conf->has("mapbox_token") && !$conf->has("maplibre_token") && !$conf->getBool("enable_stadia_maps")) {
    http_response_code(500);
    die('<html><body>Missing map token from configuration</body></html>');
} else if ($conf->getBool("db_enable")) {
    try {
        new PostGIS_PDO($conf);
    } catch (Throwable $e) {
        http_response_code(500);
        die('<html><body>The DB is unreachable</body></html>');
    }
}

?>

<html>

<body>Everything is fine</body>

</html>