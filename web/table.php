<?php
require_once("./Configuration.php");
require_once("./funcs.php");
$conf = new Configuration();
preparaHTML($conf);

?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <script
    src="https://browser.sentry-cdn.com/6.10.0/bundle.tracing.min.js"
    integrity="sha384-WPWd3xprDfTeciiueRO3yyPDiTpeh3M238axk2b+A0TuRmqebVE3hLm3ALEnnXtU"
    crossorigin="anonymous"
    ></script>
    <script src="./init.php"></script>

    <title>Open Etymology Map</title>
    <script src="https://kendo.cdn.telerik.com/2021.2.616/js/jquery.min.js"></script>
    <script src="https://kendo.cdn.telerik.com/2021.2.616/js/kendo.all.min.js"></script>
    <link rel="stylesheet" href="https://kendo.cdn.telerik.com/2021.2.616/styles/kendo.common.min.css" />   
    <link rel="stylesheet" href="https://kendo.cdn.telerik.com/2021.2.616/styles/kendo.material.min.css" />
</head>
<body>
    <div id="element_grid"></div>
    <script src="./script.js"></script>
</body>
</html>
