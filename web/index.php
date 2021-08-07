<?php
require_once("./app/IniFileConfiguration.php");
require_once("./funcs.php");
$conf = new IniFileConfiguration();
prepareHTML($conf);

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
    
    <link rel="stylesheet" href="./style.css" />

    <script src='https://api.mapbox.com/mapbox-gl-js/v2.3.1/mapbox-gl.js'></script>
    <link href='https://api.mapbox.com/mapbox-gl-js/v2.3.1/mapbox-gl.css' rel='stylesheet' />
    
    <script defer async src="https://kendo.cdn.telerik.com/2021.2.616/js/jquery.min.js"></script>
    <script defer async src="https://kendo.cdn.telerik.com/2021.2.616/js/kendo.all.min.js"></script>
    <link rel="stylesheet" href="https://kendo.cdn.telerik.com/2021.2.616/styles/kendo.common.min.css" />
    <link rel="stylesheet" href="https://kendo.cdn.telerik.com/2021.2.616/styles/kendo.bootstrap.min.css" />
</head>
<body>
    <div id='map'></div>
    <script async defer src="./index.js"></script>
    <script type="application/x-kendo-template" id="detail_template">
    <div class="detail_container">
        <h4>#=name#</h4>
        # JSON.parse(etymologies).forEach(function (ety) { #
        <div class="header column">
            <h2>#=ety.name#</h2>
            # if (ety.description) { #<h3>#=ety.description#</h3># } #
        </div>
        <div class="body row">
            <div class="etymology column">
                <div class="info column">
                    <a href="http://www.wikidata.org/entity/#=ety.id#" class="k-button" target="_blank"><img src="img/wikidata.png" alt="Wikidata logo"> Wikidata</a>
                    # if (ety.wikipedia) { #
                    <a href="#=ety.wikipedia#" class="k-button" target="_blank"><img src="img/wikipedia.png" alt="Wikipedia logo"> Wikipedia</a>
                    # }
                    if (ety.birth_date || ety.birth_place || ety.death_date || ety.death_place) { #
                    <p>#=ety.birth_date?kendo.toString(ety.birth_date,"d"):"?"# (#=ety.birth_place?ety.birth_place:"?"#) - #=ety.death_date?kendo.toString(ety.death_date,"d"):"?"# (#=ety.death_place?ety.death_place:"?"#)</p>
                    # } #
                </div>
                # if (ety.pictures) { #
                <div class="pictures row">
                # ety.pictures.forEach(function (img) { #
                    <a href="#=img#"><img src="#=img#" alt="Etymology picture" /></a>
                # }); #
                </div>
                # } #
            </div>
        </div>
        # }); #
    </div>
    </script>
</body>
</html>