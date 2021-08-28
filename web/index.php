<?php
require_once("./app/IniFileConfiguration.php");
require_once("./funcs.php");

use \App\IniFileConfiguration;

$conf = new IniFileConfiguration();
prepareHTML($conf);

$langMatches = [];
if(!empty($_REQUEST['lang'])
    && is_string($_REQUEST['lang'])
    && preg_match("/^([a-z]{2}-[A-Z]{2})$/", $_REQUEST['lang'])) {
    $defaultCulture = $_REQUEST['lang'];
} elseif (!empty($_SERVER['HTTP_ACCEPT_LANGUAGE'])
    && is_string($_SERVER['HTTP_ACCEPT_LANGUAGE'])
    && preg_match("/([a-z]{2}-[A-Z]{2})/", $_SERVER['HTTP_ACCEPT_LANGUAGE'], $langMatches)
    && isset($langMatches[0])) {
    $defaultCulture = $langMatches[0];
} elseif ($conf->has('default-language')) {
    $defaultCulture = (string)$conf->get('default-language');
} else {
    $defaultCulture = "en-US";
}

?>

<!DOCTYPE html>
<html lang="<?= $defaultCulture; ?>">

<?php
if(!$conf->has("mapbox-gl-token")) {
?>

<body>Missing Mapbox GL JS token from configuration</body>

<?php
} else {
?>

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <?php if ($conf->has("sentry-js-dsn")) { ?>
    <script src="https://browser.sentry-cdn.com/6.10.0/bundle.tracing.min.js" integrity="sha384-WPWd3xprDfTeciiueRO3yyPDiTpeh3M238axk2b+A0TuRmqebVE3hLm3ALEnnXtU" crossorigin="anonymous" type="application/javascript"></script>
    <?php
    }
    
    if ($conf->has("google-analytics-id")) {
    ?>
    <script async src="https://www.googletagmanager.com/gtag/js?id=<?=(string)$conf->get("google-analytics-id");?>"></script>
    <?php
    }
    ?>
    <script src="./init.php" type="application/javascript"></script>

    <title>Open Etymology Map</title>

    <script defer src='https://api.mapbox.com/mapbox-gl-js/v2.3.1/mapbox-gl.js' type="application/javascript"></script>
    <script defer src="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v4.7.2/mapbox-gl-geocoder.min.js" type="application/javascript"></script>
    <script defer src="https://kendo.cdn.telerik.com/2021.2.616/js/jquery.min.js" type="application/javascript"></script>
    <script defer src="https://kendo.cdn.telerik.com/2021.2.616/js/kendo.all.min.js" type="application/javascript"></script>
    <script defer src="https://kendo.cdn.telerik.com/2021.2.616/js/messages/kendo.messages.<?= $defaultCulture; ?>.min.js" type="application/javascript"></script>
    <script defer src="./index.js" type="application/javascript"></script>

    <link rel="stylesheet" href="./style.css" type="text/css" />
    <link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/v2.3.1/mapbox-gl.css" type="text/css" />
    <link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v4.7.2/mapbox-gl-geocoder.css" type="text/css">
    <link rel="stylesheet" href="https://kendo.cdn.telerik.com/2021.2.616/styles/kendo.common.min.css" type="text/css" />
    <link rel="stylesheet" href="https://kendo.cdn.telerik.com/2021.2.616/styles/kendo.bootstrap.min.css" type="text/css" />
</head>

<body>
    <noscript><h1>You need Javascript enabled to run this web app</h1></noscript>
    <div id='map'></div>
    <div id="intro">
        <h1>Open Etymology Map</h1>
        <h3>OpenStreetMap+Wikidata based etymology map.</h3>
        <p>This web app uses OpenStreetMap and Wikidata to show the etymology of places on the map.</p>
        <p>
            Used technologies:
            <ul>
                <li><a href="https://www.openstreetmap.org/about">OpenStreetMap</a></li>
                <li><a href="https://www.wikidata.org/wiki/Wikidata:Introduction">Wikidata</a> and its <a href="https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service">SPARQL Query Service</a></li>
                <li><a href="https://wiki.openstreetmap.org/wiki/Overpass_API">Overpass API</a></li>
                <li><a href="https://www.mapbox.com/mapbox-gljs">Mapbox GL JS</a></li>
            </ul>
        </p>
    </div>

    <script type="application/x-kendo-template" id="detail_template">
        <div class="detail_container">
            <h3>📍 #:properties.name#</h3>
            <a href="https://www.openstreetmap.org/#:properties["@id"]#" class="k-button" target="_blank"><img src="img/osm.svg" alt="OpenStreetMap logo">OpenStreetMap</a>
            <div class="etymologies grid grid-auto">
                # JSON.parse(properties.etymologies).forEach(function (ety) { #
                <div class="etymology grid grid-two">
                    <div class="column">
                    <div class="header column">
                        <h2>#:ety.name#</h2>
                        # if (ety.description) { # <h3>#:ety.description#</h3> # } #
                    </div>
                    <div class="info column">
                        <a href="#:ety.wikidata#" class="k-button" target="_blank"><img src="img/wikidata.svg" alt="Wikidata logo"> Wikidata</a>
                        
                        # if (ety.wikipedia) { #
                        <a href="#:ety.wikipedia#" class="k-button" target="_blank"><img src="img/wikipedia.png" alt="Wikipedia logo"> Wikipedia</a>
                        # } #
                        
                        # if (ety.commons) { #
                        <a href="https://commons.wikimedia.org/wiki/Category:#:ety.commons#" class="k-button" target="_blank"><img src="img/commons.svg" alt="Wikimedia Commons logo"> Commons</a>
                        # } #

                        # if (ety.birth_date || ety.birth_place || ety.death_date || ety.death_place) { #
                        <hr />
                        <p>📅
                            #=ety.birth_date ? (new Date(ety.birth_date)).toLocaleDateString(document.documentElement.lang) : "?"#
                            (#:ety.birth_place ? ety.birth_place : "?"#)
                            -
                            #=ety.death_date ? (new Date(ety.death_date)).toLocaleDateString(document.documentElement.lang) : "?"#
                            (#:ety.death_place ? ety.death_place : "?"#)
                        </p>
                        # } else if (ety.event_date) { #
                        <hr />
                        <p>📅
                            #=ety.event_date ? (new Date(ety.event_date)).toLocaleDateString(document.documentElement.lang) : "?"#
                        </p>
                        # } else if (ety.start_date || ety.end_date) { #
                        <hr />
                        <p>📅
                            #=ety.start_date ? (new Date(ety.start_date)).toLocaleDateString(document.documentElement.lang) : "?"#
                            -
                            #=ety.end_date ? (new Date(ety.end_date)).toLocaleDateString(document.documentElement.lang) : "?"#
                        </p>
                        # } #

                        # if (ety.event_place) { #
                        <hr />
                        <p>📍 #:ety.event_place ? ety.event_place : "?"#</p>
                        # } #

                        # if(ety.citizenship) { # <hr /><p>🌍 #:ety.citizenship#</p> # } #
                        
                        # if(ety.gender) { # <hr /><p>⚧️ #:ety.gender#</p> # } #
                        
                        # if(ety.occupations) { # <hr /><p>🛠️ #:ety.occupations#</p> # } #
                        
                        # if(ety.prizes) { # <hr /><p>🏆 #:ety.prizes#</p> # } #
                    </div>
                    </div>
                    # if (ety.pictures) { #
                    <div class="pictures column">
                    # ety.pictures.forEach(function (img,n) { if(n < 5) { #
                        <a href="#=img#" target="_blank"><img src="#=img#" alt="Etymology picture" /></a>
                    # }}); #
                    </div>
                    # } #
                </div>
                # }); #
            </div>
        </div>
    </script>
</body>

</html>
<?php
}
?>