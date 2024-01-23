<?php

declare(strict_types=1);
require_once(__DIR__ . "/funcs.php");

use \App\Config\IniEnvConfiguration;

$conf = new IniEnvConfiguration();

header("Cache-Control: no-cache", true);
prepareHTML($conf);

if (!$conf->has("i18n_override")) {
    http_response_code(500);
    die('<html><body>Missing i18n_override configuration</body></html>');
}

?>

<html>

<body>Everything is fine</body>

</html>