<?php

namespace App;

require_once(__DIR__ . "/Configuration.php");

use PDO;
use Exception;
use \App\Configuration;

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

        if ($dbname == null && $conf->has("db_database_list")) {
            $server = (string)$_SERVER["SERVER_NAME"];
            $dbname_array = json_decode((string)$conf->get("db_database_list"), true);
            if (!is_array($dbname_array))
                throw new Exception("Bad db_database_list configuration");
            if (!empty($dbname_array[$server])) {
                $dbname = (string)$dbname_array[$server];
                error_log("Using DB name '$dbname' for server '$server'");
            }
        }

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
