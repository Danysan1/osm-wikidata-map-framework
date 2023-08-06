<?php

require_once(__DIR__ . "/../vendor/autoload.php");

$routeWhitelist = [
    "/^\/$/" => ["index.php", "text/html"],
    "/^\/((?:health|index|elements|etymologyMap|stats).php)$/" => ['$1', "text/html"],
    "/^\/(dist\/[\d\w]+.js)$/" => ['$1', "application/javascript"],
    "/^\/(dist\/[\d\w]+.css)$/" => ['$1', "text/css"],
    "/^\/((?:stats|taginfo|toolinfo).json)$/" => ['$1.php', "application/json"],
    "/^\/((?:elements|etymologyMap).geojson)$/" => ['$1.php', "application/geo+json"],
    "/^\/lambda.php$/" => ["health.php", "text/html"],
];

$route = $_SERVER["REQUEST_URI"];
foreach ($routeWhitelist as $pattern => $routeInfo) {
    if (preg_match($pattern, $route)) {
        $file = $routeInfo[0];
        $mimeType = $routeInfo[1];
        //error_log("Route $route => Serving $file as $mimeType");

        header("Content-Type: $mimeType");
        require $file;

        return;
    }
}

error_log("Bad route: $route");
http_response_code(403);