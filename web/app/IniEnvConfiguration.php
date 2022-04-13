<?php

namespace App;

require_once(__DIR__ . "/IniFileConfiguration.php");
require_once(__DIR__ . "/EnvironmentConfiguration.php");
require_once(__DIR__ . "/MultiConfiguration.php");

use App\IniFileConfiguration;
use App\EnvironmentConfiguration;
use App\MultiConfiguration;

class IniEnvConfiguration extends MultiConfiguration
{
    public function __construct(?string $iniFilePath = null)
    {
        $environmentConfiguration = new EnvironmentConfiguration();

        if (!empty($iniFilePath)) {
            $iniFileConfiguration = new IniFileConfiguration($iniFilePath);
        } elseif ($environmentConfiguration->has("config_file")) {
            $iniFilePath = $environmentConfiguration->get("config_file");
            $iniFileConfiguration = new IniFileConfiguration($iniFilePath);
        } else {
            $iniFileConfiguration = new IniFileConfiguration();
        }

        parent::__construct([$iniFileConfiguration, $environmentConfiguration]);
    }
}
