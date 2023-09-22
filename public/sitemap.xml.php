<?php

declare(strict_types=1);
require_once(__DIR__ . "/funcs.php");

use \App\Config\IniEnvConfiguration;

$conf = new IniEnvConfiguration();

if ($conf->has("sitemap_url"))
    header("Location: " . (string)$conf->get("sitemap_url"), true, 301);
else
    http_response_code(404);
