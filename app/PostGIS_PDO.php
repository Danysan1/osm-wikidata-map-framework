<?php

declare(strict_types=1);

namespace App;


use PDO;
use Exception;
use \App\Config\Configuration;

class PostGIS_PDO extends PDO
{
    public function __construct(
        Configuration $conf,
        ?string $host = null,
        ?int $port = null,
        ?string $dbname = null,
        ?string $user = null,
        ?string $password = null
    ) {
        if (!$conf->getBool("db_enable"))
            throw new Exception("The usage of the DB is disabled in the configuration");

        $host = $host ?: (string)$conf->get("db_host");
        $port = $port ?: (int)$conf->get("db_port");
        $dbname = $dbname ?: (string)$conf->get("db_database");
        $user = $user ?: (string)$conf->get("db_user");
        $password = $password ?: (string)$conf->get("db_password");

        parent::__construct(
            "pgsql:host=$host;port=$port;dbname=$dbname;options=--application_name=open_etymology_map",
            $user,
            $password,
            [
                PDO::ATTR_EMULATE_PREPARES => false, // https://websitebeaver.com/php-pdo-prepared-statements-to-prevent-sql-injection
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
            ]
        );
    }
}
