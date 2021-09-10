<?php
require_once("./app/IniFileConfiguration.php");
require_once("./funcs.php");

use \App\IniFileConfiguration;

$conf = new IniFileConfiguration();
prepareHTML($conf);

$langMatches = [];
if (
    !empty($_REQUEST['lang'])
    && is_string($_REQUEST['lang'])
    && preg_match("/^([a-z]{2}-[A-Z]{2})$/", $_REQUEST['lang'])
) {
    $defaultCulture = $_REQUEST['lang'];
} elseif (
    !empty($_SERVER['HTTP_ACCEPT_LANGUAGE'])
    && is_string($_SERVER['HTTP_ACCEPT_LANGUAGE'])
    && preg_match("/([a-z]{2}-[A-Z]{2})/", $_SERVER['HTTP_ACCEPT_LANGUAGE'], $langMatches)
    && isset($langMatches[0])
) {
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
if (!$conf->has("mapbox-gl-token")) {
?>

<body>Missing Mapbox GL JS version or token from configuration</body>

<?php
} else {
?>

<head>
    <link rel="preload" as="script" type="application/javascript" href="./init.php">
    <link rel="preload" as="script" type="application/javascript" href="./node_modules/mapbox-gl/dist/mapbox-gl.js">
    <link rel="preload" as="script" type="application/javascript" href="./node_modules/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.min.js">
    <link rel="preload" as="script" type="application/javascript" href="./index.js">
    <link rel="preload" as="style" type="text/css" href="./node_modules/mapbox-gl/dist/mapbox-gl.css" />
    <link rel="preload" as="style" type="text/css" href="./node_modules/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css" />
    <link rel="preload" as="style" type="text/css" href="./style.css" />

    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">

    <?php if ($conf->has("sentry-js-dsn")) { ?>
        <script src="./node_modules/@sentry/browser/build/bundle.min.js" type="application/javascript"></script>
    <?php
    }

    if ($conf->has("google-analytics-id")) {
    ?>
        <script async src="https://www.googletagmanager.com/gtag/js?id=<?= (string)$conf->get("google-analytics-id"); ?>"></script>
    <?php
    }
    ?>
    <script src="./init.php" type="application/javascript"></script>

    <title>Open Etymology Map</title>
    <meta name="description" content="Interactive map that uses OpenStreetMap and Wikidata to show the etymology of streets and points of interest." />

    <script defer src='./node_modules/mapbox-gl/dist/mapbox-gl.js' type="application/javascript"></script>
    <script defer src="./node_modules/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.min.js" type="application/javascript"></script>

    <script defer src="./index.js" type="application/javascript"></script>

    <link rel="stylesheet" href="./style.css" type="text/css" />
    <!--<link rel="stylesheet" href="./w3.css" type="text/css">-->
    <link rel="stylesheet" href="./node_modules/mapbox-gl/dist/mapbox-gl.css" type="text/css" />
    <link rel="stylesheet" href="./node_modules/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css" type="text/css">

    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://www.dsantini.it/etymology/" />
    <meta property="og:title" content="Open Etymology Map" />
    <meta property="og:site_name" content="Open Etymology Map" />
    <meta property="og:description" content="Interactive map that uses OpenStreetMap and Wikidata to show the etymology of streets and points of interest." />
    <meta property="og:locale" content="<?= $defaultCulture; ?>" />
    <meta name="author" content="Daniele Santini">
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://www.dsantini.it/etymology/" />
</head>

<body>
    <div id='map'></div>
    <div id="intro">
        <h1>Open Etymology Map</h1>
        <h2>OpenStreetMap+Wikidata based etymology map.</h2>
        <p>Interactive map that uses OpenStreetMap and Wikidata to show the etymology of streets and points of interest.</p>
        <p>
            Used technologies:
        <ul>
            <li><a title="OpenStreetMap" href="https://www.openstreetmap.org/about">OpenStreetMap</a></li>
            <li><a title="Wikidata" href="https://www.wikidata.org/wiki/Wikidata:Introduction">Wikidata</a> and its <a title="Wikidata SPARQL Query Service" href="https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service">SPARQL Query Service</a></li>
            <li><a title="Overpass API" href="https://wiki.openstreetmap.org/wiki/Overpass_API">Overpass API</a></li>
            <li><a title="Mapbox GL JS" href="https://www.mapbox.com/mapbox-gljs">Mapbox GL JS</a></li>
        </ul>
        </p>
        <p>
            <a title="Open Etymology Map issue tracker" href="https://gitlab.com/dsantini/open-etymology-map/-/issues">Report a problem</a> |
            <a title="Open Etymology Map git repository" href="https://gitlab.com/dsantini/open-etymology-map">Contribute</a> |
            <a title="Daniele Santini personal website" href="https://www.dsantini.it">About me</a>
        </p>
        <h3>Click anywhere on the map to explore.</h3>
    </div>
    <h2>The map is loading...</h2>
    <noscript>
        <strong>You need Javascript enabled to run this web app</strong>
    </noscript>
    <div id="snackbar"></div>

    <template id="detail_template">
        <div class="detail_container">
            <h2 class="element_name"></h2>
            <a title="Element on OpenStreetMap" class="k-button w3-button w3-white w3-border w3-border w3-round-large osm_button" target="_blank"><img src="img/osm.svg" alt="OpenStreetMap logo">OpenStreetMap</a>
            <div class="etymologies_container grid grid-auto">

            </div>
        </div>
    </template>

    <template id="etymology_template">
        <div class="etymology grid grid-auto">
            <div class="column">
                <div class="header column etymology_header">
                    <h1 class="etymology_name"></h1>
                    <h3 class="etymology_description"></h3>
                </div>
                <div class="info column">
                    <a title="Subject on Wikidata" class="k-button w3-button w3-white w3-border w3-border w3-round-large wikidata_button" target="_blank"><img src="img/wikidata.svg" alt="Wikidata logo"> Wikidata</a>
                    <a title="Subject on Wikipedia" class="k-button w3-button w3-white w3-border w3-border w3-round-large wikipedia_button" target="_blank"><img src="img/wikipedia.png" alt="Wikipedia logo"> Wikipedia</a>
                    <a title="Subject on Wikimedia Commons" class="k-button w3-button w3-white w3-border w3-border w3-round-large commons_button" target="_blank"><img src="img/commons.svg" alt="Wikimedia Commons logo"> Commons</a>

                    <p class="start_end_date"></p>
                    <p class="event_place"></p>

                    <p class="citizenship"></p>
                    <p class="gender"></p>
                    <p class="occupations"></p>
                    <p class="prizes"></p>
                </div>
            </div>

            <div class="pictures column"></div>
        </div>
    </template>
</body>

</html>
<?php
}
?>