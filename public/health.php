<?php
require_once(__DIR__ . "/../app/IniEnvConfiguration.php");
require_once(__DIR__ . "/../app/PostGIS_PDO.php");
require_once("./funcs.php");

use \App\IniEnvConfiguration;
use App\PostGIS_PDO;

$conf = new IniEnvConfiguration();

prepareHTML($conf);

if (!$conf->has("mapbox_token")) {
    http_response_code(500);
    die('<html><body>Missing Mapbox token from configuration</body></html>');
} else if ($conf->getDbEnable()) {
    try {
        $dbh = new PostGIS_PDO($conf);
    } catch (Throwable $e) {
        http_response_code(500);
        die('<html><body>The DB is unreachable</body></html>');
    }

    /*try {
        $dbh->query("SELECT PostGIS_Version()")->fetchColumn();
    } catch (Throwable $e) {
        http_response_code(500);
        die('<html><body>The DB is not working or missing PostGIS</body></html>');
    }*/
}

?>

<html>

<body>Everything is fine</body>

</html>