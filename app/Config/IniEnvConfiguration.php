<?php

declare(strict_types=1);

namespace App\Config;

use \App\Config\EnvFileConfiguration;
use \App\Config\IniFileConfiguration;
use \App\Config\EnvironmentConfiguration;
use \App\Config\MultiConfiguration;
use \Throwable;

class IniEnvConfiguration extends MultiConfiguration
{
    public function __construct()
    {

        $configs = [];

        try {
            $configs[] = new EnvFileConfiguration();
        } catch (Throwable $e) {
            //error_log("Not using .env configuration because of an error - " . $e->getMessage());
        }

        try {
            $configs[] = new IniFileConfiguration();
        } catch (Throwable $e) {
            //error_log("Not using .ini configuration because of an error - " . $e->getMessage());
        }

        $configs[] = new EnvironmentConfiguration();

        parent::__construct($configs);

        //error_log(json_encode($this->listKeys()));
    }
}
