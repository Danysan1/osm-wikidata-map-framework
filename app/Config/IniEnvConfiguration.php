<?php

declare(strict_types=1);

namespace App\Config;

use \Dotenv\Dotenv;
use \App\Config\IniFileConfiguration;
use \App\Config\EnvironmentConfiguration;
use \App\Config\MultiConfiguration;
use \Throwable;

class IniEnvConfiguration extends MultiConfiguration
{
    public function __construct(?string $iniFilePath = null)
    {
        if (file_exists(__DIR__ . "/../../.env")) {
            try {
                $dotenv = Dotenv::createImmutable(__DIR__ . "/../..");
                $dotenv->load();
            } catch (Throwable $e) {
                error_log("Not using .env - " . $e->getMessage());
            }
        }

        $configs = [new EnvironmentConfiguration()];

        try {
            $configs[] = new IniFileConfiguration();
        } catch (Throwable $e) {
            //error_log("Not using .ini - " . $e->getMessage());
        }

        parent::__construct($configs);

        //error_log(json_encode($this->listKeys()));
    }
}
