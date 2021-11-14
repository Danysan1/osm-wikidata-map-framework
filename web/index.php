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

$useSentry = $conf->has("sentry-js-dsn");
$useGoogleAnalytics = $conf->has("google-analytics-id");

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
    <?php if($useSentry) { ?>
    <link rel="preload" as="script" type="application/javascript" href="./node_modules/@sentry/browser/build/bundle.min.js">
    <?php } ?>

    <link rel="preload" as="script" type="application/javascript" href="./init.php">
    <link rel="preload" as="script" type="application/javascript" href="./node_modules/mapbox-gl/dist/mapbox-gl.js">
    <link rel="preload" as="script" type="application/javascript" href="./node_modules/@mapbox/mapbox-gl-language/index.js">
    <link rel="preload" as="script" type="application/javascript" href="./node_modules/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.min.js">
    <link rel="preload" as="script" type="application/javascript" href="./index.js">
    <link rel="preload" as="style" type="text/css" href="./node_modules/mapbox-gl/dist/mapbox-gl.css" />
    <link rel="preload" as="style" type="text/css" href="./node_modules/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css" />
    <link rel="preload" as="style" type="text/css" href="./style.css" />
    <!--<link rel="preload" as="fetch" type="application/json" href="./global-map.geojson" crossorigin>-->

    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">

    <?php if ($useSentry) { ?>
        <script src="./node_modules/@sentry/browser/build/bundle.min.js" type="application/javascript"></script>
    <?php
    }

    if ($useGoogleAnalytics) {
    ?>
        <script async src="https://www.googletagmanager.com/gtag/js?id=<?= (string)$conf->get("google-analytics-id"); ?>"></script>
    <?php
    }
    ?>
    <script src="./init.php" type="application/javascript"></script>

    <title>Open Etymology Map</title>
    <meta name="description" content="Interactive map that shows the etymology of streets and points of interest based on OpenStreetMap and Wikidata." />

    <link rel="stylesheet" href="./style.css" type="text/css" />
    <!--<link rel="stylesheet" href="./w3.css" type="text/css">-->
    <link rel="stylesheet" href="./node_modules/mapbox-gl/dist/mapbox-gl.css" type="text/css" />
    <link rel="stylesheet" href="./node_modules/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css" type="text/css">

    <script defer src='./node_modules/mapbox-gl/dist/mapbox-gl.js' type="application/javascript"></script>
    <script src='./node_modules/@mapbox/mapbox-gl-language/index.js' type="application/javascript"></script>
    <script defer src="./node_modules/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.min.js" type="application/javascript"></script>

    <script defer src="./index.js" type="application/javascript"></script>
    <script defer src="./node_modules/chart.js/dist/chart.min.js" type="application/javascript"></script>
    <script defer src="./node_modules/chartjs-plugin-datalabels/dist/chartjs-plugin-datalabels.min.js" type="application/javascript"></script>

    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://www.dsantini.it/etymology/" />
    <meta property="og:title" content="Open Etymology Map" />
    <meta property="og:site_name" content="Open Etymology Map" />
    <meta property="og:description" content="Interactive map that shows the etymology of streets and points of interest based on OpenStreetMap and Wikidata." />
    <meta property="og:locale" content="<?= $defaultCulture; ?>" />
    <meta name="author" content="Daniele Santini">
    <meta name="robots" content="index, follow" />
    <meta name="keywords" content="etymology, hodonyms, odonymy, onomastica, odonomastica, odonimia, odonimi, Straßenname, odónimo, Odonymie, straatnaam, Toponym, OpenStreetMap, Wikidata, map, open data, linked data, urban, city">
    <link rel="canonical" href="https://www.dsantini.it/etymology/" />
</head>

<body>
    <div id='map'></div>
    <div id="intro">
        <h1>Open Etymology Map</h1>
        <p>Interactive map that shows the etymology of streets and points of interest based on OpenStreetMap and Wikidata.</p>
        <p>
            Used technologies:
        <ul>
            <li><a title="OpenStreetMap" href="https://www.openstreetmap.org/about">OpenStreetMap</a> and its tags "<a title="OpenStreetMap name:etymology:wikidata tag" href="https://wiki.openstreetmap.org/wiki/Key:name:etymology:wikidata">name:etymology:wikidata</a>" and "<a title="OpenStreetMap name:etymology:wikidata tag" href="https://wiki.openstreetmap.org/wiki/Key:subject">subject:wikidata</a>"</li>
            <li><a title="Wikidata" href="https://www.wikidata.org/wiki/Wikidata:Introduction">Wikidata</a> and its <a title="Wikidata SPARQL Query Service" href="https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service">SPARQL Query Service</a></li>
            <li><a title="Overpass API" href="https://wiki.openstreetmap.org/wiki/Overpass_API">Overpass API</a></li>
            <li><a title="Mapbox GL JS" href="https://www.mapbox.com/mapbox-gljs">Mapbox GL JS</a></li>
        </ul>
        </p>
        <p>
            <a title="Open Etymology Map issue tracker" href="https://gitlab.com/dsantini/open-etymology-map/-/issues">Report a problem</a> |
            <a title="Open Etymology Map git repository" href="https://gitlab.com/dsantini/open-etymology-map/-/blob/main/CONTRIBUTING.md">Contribute</a> |
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
            <a title="Element on Wikipedia" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 element_wikipedia_button" style="display:none" target="_blank"><img class="button_img" src="img/wikipedia.png" alt="Wikipedia logo">Wikipedia</a>
            <a title="Element on OpenStreetMap" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 osm_button" target="_blank"><img class="button_img" src="img/osm.svg" alt="OpenStreetMap logo">OpenStreetMap</a>
            <a title="Element location" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 element_location_button" target="_self"><span class="button_img">📍</span> Location</a>
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
                    <a title="Subject on Wikipedia" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 wikipedia_button" style="display:none" target="_blank"><img class="button_img" src="img/wikipedia.png" alt="Wikipedia logo"> Wikipedia</a>
                    <a title="Subject on Wikimedia Commons" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 commons_button" style="display:none" target="_blank"><img class="button_img" src="img/commons.svg" alt="Wikimedia Commons logo"> Commons</a>
                    <a title="Subject location" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 subject_location_button" style="display:none" target="_self"><span class="button_img">📍</span> Location</a>
                    <a title="Subject on Wikidata" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 wikidata_button" target="_blank"><img class="button_img" src="img/wikidata.svg" alt="Wikidata logo"> Wikidata</a>

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