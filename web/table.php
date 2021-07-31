<?php
require_once("./Configuration.php");
require_once("./funcs.php");
$conf = new Configuration();
prepareHTML($conf);

$minLat = (float)getFilteredParamOrDefault( "minLat", FILTER_VALIDATE_FLOAT, $conf->get("default-bbox-min-lat") );
$minLon = (float)getFilteredParamOrDefault( "minLon", FILTER_VALIDATE_FLOAT, $conf->get("default-bbox-min-lon") );
$maxLat = (float)getFilteredParamOrDefault( "maxLat", FILTER_VALIDATE_FLOAT, $conf->get("default-bbox-max-lat") );
$maxLon = (float)getFilteredParamOrDefault( "maxLon", FILTER_VALIDATE_FLOAT, $conf->get("default-bbox-max-lon") );

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
    <link rel="stylesheet" href="https://kendo.cdn.telerik.com/2021.2.616/styles/kendo.bootstrap.min.css" />
    <link rel="stylesheet" href="./style.css" />
</head>
<body>
    <div id="tabstrip" class="spaced">
        <ul>
            <li class="k-state-active">Overpass</li>
            <li>Wikidata</li>
        </ul>
        <div id="overpass_tab">
            <form>
                <fieldset>
                    <legend>Bounding Box</legend>
                    <label for="minLat">Min Latitude:</label>
                    <input type="float" id="minLat" name="minLat" value="<?=$minLat;?>" class="k-textbox" />
                    <label for="maxLat">Max Latitude:</label>
                    <input type="float" id="maxLat" name="maxLat" value="<?=$maxLat;?>" class="k-textbox" />
                    <label for="minLon">Min Longitude:</label>
                    <input type="float" id="minLon" name="minLon" value="<?=$minLon;?>" class="k-textbox" />
                    <label for="maxLon">Max Longitude:</label>
                    <input type="float" id="maxLon" name="maxLon" value="<?=$maxLon;?>" class="k-textbox" />
                    <input type="button" id="searchBBox" value="Search" class="k-button" >
                </fieldset>
            </form>
            <div id="overpass_grid" class="spaced"></div>
        </div>
        <div id="wikidata_tab">
            <form>
                <fieldset>
                    <legend>Wikidata ID List</legend>
                    <select name="wdIDs" id="wdIDs"></select>
                    <input type="button" id="searchWdIDs" value="Search">
                </fieldset>
            </form>
            <div id="wikidata_grid" class="spaced"></div>
        </div>
    </div>
    <script async defer src="./table.js"></script>
</body>
</html>
