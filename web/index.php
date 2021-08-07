<?php
require_once("./app/IniFileConfiguration.php");
require_once("./funcs.php");
$conf = new IniFileConfiguration();
prepareHTML($conf);

$lang = [];
preg_match("/([a-z]{2}-[A-Z]{2})/", $_SERVER['HTTP_ACCEPT_LANGUAGE'], $lang);
//error_log($_SERVER['HTTP_ACCEPT_LANGUAGE']." => ".json_encode($lang));
if(isset($lang[0])) {
    $defaultCulture = $lang[0];
} elseif($conf->has('default-language')) {
    $defaultCulture = $conf->get('default-language');
} else {
    $defaultCulture = "en-US";
}

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
    <link rel="stylesheet" href="https://kendo.cdn.telerik.com/2021.2.616/styles/kendo.common.min.css" />
    <link rel="stylesheet" href="https://kendo.cdn.telerik.com/2021.2.616/styles/kendo.bootstrap.min.css" />

    <script defer src="https://kendo.cdn.telerik.com/2021.2.616/js/jquery.min.js"></script>
    <script defer src="https://kendo.cdn.telerik.com/2021.2.616/js/kendo.all.min.js"></script>
    <script defer src="https://kendo.cdn.telerik.com/2021.2.616/js/messages/kendo.messages.<?=$defaultCulture;?>.min.js"></script>
    <script defer src="./index.js"></script>
</head>
<body>
    <div id='map'></div>
    <input type="hidden" id="culture" value=<?=$defaultCulture;?> >

    <script type="application/x-kendo-template" id="detail_template">
        <div class="detail_container">
            <h4>#=name#</h4>
            <div class="etymologies">
                # JSON.parse(etymologies).forEach(function (ety) { #
                <div class="etymology column">
                    <div class="header column">
                        <h2>#=ety.name#</h2>
                        # if (ety.description) { #<h3>#=ety.description#</h3># } #
                    </div>
                    <div class="info column">
                        <a href="http://www.wikidata.org/entity/#=ety.id#" class="k-button" target="_blank"><img src="img/wikidata.png" alt="Wikidata logo"> Wikidata</a>
                        # if (ety.wikipedia) { #
                        <a href="#=ety.wikipedia#" class="k-button" target="_blank"><img src="img/wikipedia.png" alt="Wikipedia logo"> Wikipedia</a>
                        # }
                        if (ety.birth_date || ety.birth_place || ety.death_date || ety.death_place) { #
                        <p>#=ety.birth_date?kendo.toString(new Date(ety.birth_date),"d"):"?"# (#=ety.birth_place?ety.birth_place:"?"#) - #=ety.death_date?kendo.toString(new Date(ety.death_date),"d"):"?"# (#=ety.death_place?ety.death_place:"?"#)</p>
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
                # }); #
            </div>
        </div>
    </script>
</body>
</html>