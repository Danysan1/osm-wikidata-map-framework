<?php
require_once("./app/IniFileConfiguration.php");
require_once("./funcs.php");

use \App\IniFileConfiguration;

$conf = new IniFileConfiguration();

prepareJSON($conf);

$cacheFileBasePath = (string)$conf->get("cache-file-base-path");
echo file_get_contents($cacheFileBasePath . "global-map.geojson");
