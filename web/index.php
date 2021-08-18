<?php
require_once("./app/IniFileConfiguration.php");
require_once("./funcs.php");
$conf = new IniFileConfiguration();
prepareHTML($conf);

$lang = [];
preg_match("/([a-z]{2}-[A-Z]{2})/", (string)$_SERVER['HTTP_ACCEPT_LANGUAGE'], $lang);
//error_log($_SERVER['HTTP_ACCEPT_LANGUAGE']." => ".json_encode($lang));
if(isset($lang[0])) {
    $defaultCulture = $lang[0];
} elseif($conf->has('default-language')) {
    $defaultCulture = (string)$conf->get('default-language');
} else {
    $defaultCulture = "en-US";
}

$thresholdZoomLevel = (int)$conf->get('threshold-zoom-level');

?>

<!DOCTYPE html>
<html lang="<?=$defaultCulture;?>">
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
    
    <link rel="stylesheet" href="./style.css" />

    <script src='https://api.mapbox.com/mapbox-gl-js/v2.3.1/mapbox-gl.js'></script>
    <link href='https://api.mapbox.com/mapbox-gl-js/v2.3.1/mapbox-gl.css' rel='stylesheet' />
    <link rel="stylesheet" href="https://kendo.cdn.telerik.com/2021.2.616/styles/kendo.common.min.css" />
    <link rel="stylesheet" href="https://kendo.cdn.telerik.com/2021.2.616/styles/kendo.bootstrap.min.css" />

    <script defer src="https://kendo.cdn.telerik.com/2021.2.616/js/jquery.min.js"></script>
    <script defer src="https://kendo.cdn.telerik.com/2021.2.616/js/kendo.all.min.js"></script>
    <script defer src="https://kendo.cdn.telerik.com/2021.2.616/js/messages/kendo.messages.<?=$defaultCulture;?>.min.js"></script>
    <script defer src="./index.js"></script>
</head>
<body>
    <div id='map'></div>
    <input type="hidden" id="threshold-zoom-level" value=<?=$thresholdZoomLevel;?> >

    <script type="application/x-kendo-template" id="detail_template">
        <div class="detail_container">
            <h4>#:properties.name#</h4>
            <a href="https://www.openstreetmap.org/#:properties["@id"]#" class="k-button" target="_blank"><img src="img/osm.svg" alt="OpenStreetMap logo">OpenStreetMap</a>
            <div class="etymologies">
                # JSON.parse(properties.etymologies).forEach(function (ety) { #
                <div class="etymology column">
                    <div class="header column">
                        <h2>#:ety.name#</h2>
                        # if (ety.description) { # <h3>#:ety.description#</h3> # } #
                    </div>
                    <div class="info column">
                        <a href="#:ety.wikidata#" class="k-button" target="_blank"><img src="img/wikidata.png" alt="Wikidata logo"> Wikidata</a>
                        
                        # if (ety.wikipedia) { #
                        <a href="#:ety.wikipedia#" class="k-button" target="_blank"><img src="img/wikipedia.png" alt="Wikipedia logo"> Wikipedia</a>
                        # } #

                        # if (ety.birth_date || ety.birth_place || ety.death_date || ety.death_place) { #
                        <hr />
                        <p>
                            #=ety.birth_date ? (new Date(ety.birth_date)).toLocaleDateString(document.documentElement.lang) : "?"#
                            (#:ety.birth_place ? ety.birth_place : "?"#)
                            -
                            #=ety.death_date ? (new Date(ety.death_date)).toLocaleDateString(document.documentElement.lang) : "?"#
                            (#:ety.death_place ? ety.death_place : "?"#)
                        </p>
                        # } else if (ety.event_date || ety.event_place) { #
                        <hr />
                        <p>
                            #=ety.event_date ? (new Date(ety.event_date)).toLocaleDateString(document.documentElement.lang) : "?"#,
                            #:ety.event_place ? ety.event_place : "?"#
                        </p>
                        # } #

                        # if(ety.citizenship) { # <hr /><p>#:ety.citizenship#</p> # } #
                        
                        # if(ety.gender) { # <hr /><p>#:ety.gender#</p> # } #
                        
                        # if(ety.occupations) { # <hr /><p>#:ety.occupations#</p> # } #
                        
                        # if(ety.prizes) { # <hr /><p>#:ety.prizes#</p> # } #
                        <hr />
                    </div>
                    # if (ety.pictures) { #
                    <div class="pictures row">
                    # ety.pictures.forEach(function (img) { #
                        <a href="#=img#" target="_blank"><img src="#=img#" alt="Etymology picture" /></a>
                    # }); #
                    </div>
                    # } #
                </div>
                # }); #
            </div>
        </div>
    </script>
</body>
</html>