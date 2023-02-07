<?php

namespace App;

require_once(__DIR__ . "/IniFileConfiguration.php");
require_once(__DIR__ . "/EnvironmentConfiguration.php");
require_once(__DIR__ . "/MultiConfiguration.php");

use \App\IniFileConfiguration;
use \App\EnvironmentConfiguration;
use \App\MultiConfiguration;
use \Throwable;

class IniEnvConfiguration extends MultiConfiguration
{
    public function __construct(?string $iniFilePath = null)
    {
        $environmentConfiguration = new EnvironmentConfiguration();

        if(empty($iniFilePath) && $environmentConfiguration->has("config_file"))
                $iniFilePath = (string)$environmentConfiguration->get("config_file");
        
        if (empty($iniFilePath)) {
            //error_log("IniEnvConfiguration: missing iniFilePath, using only EnvironmentConfiguration");
            $configs = [$environmentConfiguration];
        } else {
            try {
                $iniFileConfiguration = new IniFileConfiguration($iniFilePath);
                //error_log("IniEnvConfiguration: using both IniFileConfiguration and EnvironmentConfiguration");
                $configs = [$iniFileConfiguration, $environmentConfiguration];
            } catch (Throwable $e) {
                error_log("IniEnvConfiguration: IniFileConfiguration failed, using only EnvironmentConfiguration");
                $configs = [$environmentConfiguration];
            }
        }

        parent::__construct($configs);

        //error_log(json_encode($this->listKeys()));
    }
}
