<?php
require_once("./app/IniFileConfiguration.php");
require_once("./funcs.php");
$conf = new IniFileConfiguration();
prepareHTML($conf);

$minLat = (float)getFilteredParamOrDefault( "minLat", FILTER_VALIDATE_FLOAT, $conf->get("default-bbox-min-lat") );
$minLon = (float)getFilteredParamOrDefault( "minLon", FILTER_VALIDATE_FLOAT, $conf->get("default-bbox-min-lon") );
$maxLat = (float)getFilteredParamOrDefault( "maxLat", FILTER_VALIDATE_FLOAT, $conf->get("default-bbox-max-lat") );
$maxLon = (float)getFilteredParamOrDefault( "maxLon", FILTER_VALIDATE_FLOAT, $conf->get("default-bbox-max-lon") );
$bboxIsPresent = isset($_GET["minLat"]) && isset($_GET["minLon"]) && isset($_GET["maxLat"]) && isset($_GET["maxLon"]);

$centerLat = (float)getFilteredParamOrDefault( "centerLat", FILTER_VALIDATE_FLOAT, $conf->get("default-center-lat") );
$centerLon = (float)getFilteredParamOrDefault( "centerLon", FILTER_VALIDATE_FLOAT, $conf->get("default-center-lon") );
$radius = (float)getFilteredParamOrDefault( "radius", FILTER_VALIDATE_FLOAT, $conf->get("default-radius") );
$centerIsPresent = isset($_GET["centerLat"]) && isset($_GET["centerLon"]) && isset($_GET["radius"]);

//$wdIDs = (array)getFilteredParamOrDefault( "wdIDs", FILTER_REQUIRE_ARRAY, [] );
$wdIDs = !empty($_GET["wdIDs"]) ? (array)$_GET["wdIDs"] : [];
foreach($wdIDs as $i => $id) {
    if(!is_string($id) || !preg_match("/^Q[0-9]+$/", $id)) {
        unset($wdIDs[$i]);
    }
}
$wsIDsArePresent = count($wdIDs) > 0;

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
                    <input type="hidden" name="autoStart" id="bboxAutoStart" value="<?=$bboxIsPresent ? 1 : "";?>" >
                </fieldset>
                <fieldset>
                    <legend>Center and radius</legend>
                    <label for="centerLat">Center Latitude:</label>
                    <input type="float" id="centerLat" name="centerLat" value="<?=$centerLat;?>" class="k-textbox" />
                    <label for="centerLon">Center Longitude:</label>
                    <input type="float" id="centerLon" name="centerLon" value="<?=$centerLon;?>" class="k-textbox" />
                    <label for="radius">Radius:</label>
                    <input type="float" id="radius" name="radius" value="<?=$radius;?>" class="k-textbox" />
                    <input type="button" id="searchCenter" value="Search" class="k-button" >
                    <input type="hidden" name="autoStart" id="centerAutoStart" value="<?=$centerIsPresent ? 1 : "";?>" >
                </fieldset>
            </form>
            <div id="overpass_grid" class="spaced"></div>
        </div>
        <div id="wikidata_tab">
            <form>
                <fieldset>
                    <legend>Wikidata ID List</legend>
                    <select multiple name="wdIDs" id="wdIDs">
                        <?php
                        foreach($wdIDs as $id) { echo "<option selected>$id</option>"; }
                        ?>
                    </select>
                    <input type="button" id="searchWdIDs" value="Search" class="k-button">
                    <input type="hidden" name="wdIDAutoStart" id="wdIDsAutoStart" value="<?=$wsIDsArePresent ? 1 : "";?>" >
                </fieldset>
            </form>
            <div id="wikidata_grid" class="spaced"></div>
        </div>
    </div>
    <script async defer src="./table.js"></script>
</body>
</html>
