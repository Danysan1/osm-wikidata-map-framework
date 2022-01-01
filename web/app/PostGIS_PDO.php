<?php

namespace App;

require_once(__DIR__ . "/Configuration.php");

use \PDO;
use \App\Configuration;

class PostGIS_PDO extends PDO
{
    public function __construct(Configuration $conf)
    {
        $host = (string)$conf->get("db-host");
        $port = (int)$conf->get("db-port");
        $dbname = (string)$conf->get("db-database");
        $user = (string)$conf->get("db-user");
        $password = (string)$conf->get("db-password");
        // Test $db = \pg_connect("host=$host port=$port dbname=$dbname user=$user password=$password");
        parent::__construct(
            "pgsql:host=$host;port=$port;dbname=$dbname",
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
