<?php

require_once(__DIR__ . "/../vendor/autoload.php");

echo 'Hello Lambda world!';
error_log("Hello Lambda world!");

/*$routeWhitelist = [
    "/" => "index.php",
    "" => "index.php",
    "/index.php" => "index.php",
    "index.php" => "index.php",
    "/health.php" => "health.php",
    "health.php" => "health.php",
];

if (in_array($_SERVER["SCRIPT_NAME"], $routeWhitelist)) {
    require $routeWhitelist[$_SERVER["SCRIPT_NAME"]];
} else {
    echo "Bad route:" . $event["name"];
    throw new InvalidArgumentException("Route not found");
}*/