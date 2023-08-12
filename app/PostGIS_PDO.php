<?php

declare(strict_types=1);

namespace App;


use PDO;
use Exception;
use \App\Config\Configuration;

/**
 * Represents a connection between PHP and a PostGIS database server.
 * 
 * @see https://www.postgresql.org/docs/current/
 * @see https://www.php.net/manual/en/ref.pdo-pgsql.connection.php
 */
class PostGIS_PDO extends PDO
{
    public function __construct(Configuration $conf)
    {
        if (!$conf->getBool("db_enable"))
            throw new Exception("The usage of the DB is disabled in the configuration");

        $host = (string) $conf->get("db_host");
        $port = (int) $conf->get("db_port");
        $dbname = (string) $conf->get("db_database");
        $user = (string) $conf->get("db_user");
        $password = (string) $conf->get("db_password");
        $sslmode = $conf->has("db_sslmode") ? (string) $conf->get("db_sslmode") : "prefer";
        $options = $conf->has("db_endpoint") ? ";options=endpoint=" . (string) $conf->get("db_endpoint") : "";

        parent::__construct(
            "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=$sslmode;application_name=owmf$options",
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
