<?php
require_once("./app/IniEnvConfiguration.php");
require_once("./funcs.php");

use \App\IniEnvConfiguration;

$conf = new IniEnvConfiguration();
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

if (!$conf->has("mapbox-gl-token")) {
    http_response_code(500);
    die('<html><body>Missing Mapbox GL JS token from configuration</body></html>');
}

?>

<!DOCTYPE html>
<html lang="<?= $defaultCulture; ?>">

<head>
    <?php if ($useSentry) { ?>
        <link
            rel="preload"
            as="script"
            type="application/javascript"
            href="https://browser.sentry-cdn.com/7.3.1/bundle.tracing.min.js"
            integrity="sha384-iptjDHZXu0VPs27rpz7gMPerGBSnwZdj2zsbnT5m5bjmcNk8tjHmzD/GJn8UjaO7"
            crossorigin="anonymous" />
    <?php
    }

    $mapboxGlJS = $conf->has('debug') && $conf->get('debug') ? 'mapbox-gl-dev.js' : 'mapbox-gl.js';
    ?>
    <link rel="preload" as="script" type="application/javascript" href="./init.php">
    <link rel="preload" as="script" type="application/javascript" href="./node_modules/mapbox-gl/dist/<?= $mapboxGlJS; ?>">
    <link rel="preload" as="script" type="application/javascript" href="./node_modules/@mapbox/mapbox-gl-language/index.js">
    <link rel="preload" as="script" type="application/javascript" href="./node_modules/@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.min.js">
    <link rel="preload" as="script" type="application/javascript" href="./index.js">
    <link rel="preload" as="style" type="text/css" href="./node_modules/mapbox-gl/dist/mapbox-gl.css" />
    <link rel="preload" as="style" type="text/css" href="./node_modules/@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css" />
    <link rel="preload" as="style" type="text/css" href="./style.css" />
    <!--<link rel="preload" as="fetch" type="application/json" href="./global-map.geojson" crossorigin="anonymous" />-->

    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">

    <?php if ($useSentry) { ?>
        <script
            src="https://browser.sentry-cdn.com/7.3.1/bundle.tracing.min.js"
            integrity="sha384-iptjDHZXu0VPs27rpz7gMPerGBSnwZdj2zsbnT5m5bjmcNk8tjHmzD/GJn8UjaO7"
            crossorigin="anonymous"
        ></script>
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
    <meta name="description" content="Interactive map that shows the etymology of names of streets and points of interest based on OpenStreetMap and Wikidata." />

    <link rel="stylesheet" href="./style.css" type="text/css" />
    <link rel="stylesheet" href="./node_modules/mapbox-gl/dist/mapbox-gl.css" type="text/css" />
    <link rel="stylesheet" href="./node_modules/@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css" type="text/css">

    <script defer src='./node_modules/mapbox-gl/dist/<?= $mapboxGlJS; ?>' type="application/javascript"></script>
    <script src='./node_modules/@mapbox/mapbox-gl-language/index.js' type="application/javascript"></script>
    <script defer src="./node_modules/@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.min.js" type="application/javascript"></script>

    <script defer src="./index.js" type="application/javascript"></script>
    <script defer src="./node_modules/chart.js/dist/chart.min.js" type="application/javascript"></script>

    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://etymology.dsantini.it/" />
    <meta property="og:title" content="Open Etymology Map" />
    <meta property="og:site_name" content="Open Etymology Map" />
    <meta property="og:description" content="Interactive map that shows the etymology of names of streets and points of interest based on OpenStreetMap and Wikidata." />
    <meta property="og:locale" content="<?= $defaultCulture; ?>" />
    <meta name="author" content="Daniele Santini">
    <meta name="robots" content="index, follow" />
    <meta name="keywords" content="etymology, etymologie, etimoloji, hodonyms, odonymy, odonomastica, odonimia, odonimi, Straßenname, odónimo, odonymie, straatnaam, odoniemen, toponym, toponymy, toponimi, toponomastica, toponymie, Ortsname, OpenStreetMap, Wikidata, map, mappa, karte, open data, linked data, structured data, urban, city">
    <link rel="canonical" href="https://etymology.dsantini.it/" />
    <link type="image/png" sizes="16x16" rel="icon" href="./icons8-quest-16.png">
    <link type="image/png" sizes="32x32" rel="icon" href="./icons8-quest-32.png">
    <link type="image/png" sizes="96x96" rel="icon" href="./icons8-quest-96.png">
</head>

<body>
    <div id="map_container">
        <div id='map'></div>
        <img id="map_static_preview"></img>
        <div id="intro">
            <h1>Open Etymology Map</h1>
            <p>Interactive map that shows the etymology of names of streets and points of interest based on OpenStreetMap and Wikidata.</p>

            <a title="Contribute to the map" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 contribute_button" href="https://gitlab.com/openetymologymap/open-etymology-map/-/blob/main/CONTRIBUTING.md#how-to-contribute-to-the-etymology-data"><span class="button_img">📖</span> Contribute to the map</a>

            <p>
                <?= implode(" | ", [
                    is_file('LAST_UPDATE') ? 'Last update: ' . htmlspecialchars(file_get_contents('LAST_UPDATE')) : false,
                    $conf->has("report-problem-url") ? '<a title="Report a problem in Open Etymology Map" href="' . $conf->get("report-problem-url") . '">Report a problem</a>' : false,
                    '<a title="Daniele Santini personal website" href="https://www.dsantini.it/">About me</a>',
                    '<a href="https://icons8.com/icon/32958/quest">Quest</a> icon by <a href="https://icons8.com">Icons8</a>'
                ]); ?>
            </p>
            <h3>Click anywhere on the map to explore.</h3>
        </div>
        <h2>The map is loading...</h2>
    </div>
    <noscript>
        <strong>You need Javascript enabled to run this web app</strong>
    </noscript>
    <div id="snackbar"></div>

    <template id="detail_template">
        <div class="detail_container">
            <h3 class="element_name"></h3>
            <a title="Element on Wikipedia" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 element_wikipedia_button" style="display:none"><img class="button_img" src="img/wikipedia.png" alt="Wikipedia logo"><span class="button_text"> Wikipedia</span></a>
            <a title="Element on Wikimedia Commons" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 element_commons_button" style="display:none"><img class="button_img" src="img/commons.svg" alt="Wikimedia Commons logo"><span class="button_text"> Commons</span></a>
            <a title="Element on OpenStreetMap" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 osm_button"><img class="button_img" src="img/osm.svg" alt="OpenStreetMap logo"><span class="button_text"> OpenStreetMap</span></a>
            <a title="Element location" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 element_location_button" target="_self"><span class="button_img">📍</span><span class="button_text"> Location</span></a>
            <div class="etymologies_container grid grid-auto">

            </div>
            <a title="Report a problem in this element" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 ety_error_button" href="https://gitlab.com/openetymologymap/open-etymology-map/-/blob/main/CONTRIBUTING.md#how-to-report-a-problem-in-the-etymology-of-an-element"><span class="button_img">⚠️</span> Report a problem in this element</a>
        </div>
    </template>

    <template id="etymology_template">
        <div class="etymology">
            <div class="grid grid-auto">
                <div class="column">
                    <div class="header column etymology_header">
                        <h2 class="etymology_name"></h2>
                        <h3 class="etymology_description"></h3>
                    </div>
                    <div class="info column">
                        <a title="Subject on Wikipedia" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 wikipedia_button" style="display:none"><img class="button_img" src="img/wikipedia.png" alt="Wikipedia logo"><span class="button_text"> Wikipedia</span></a>
                        <a title="Subject on Wikimedia Commons" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 commons_button" style="display:none"><img class="button_img" src="img/commons.svg" alt="Wikimedia Commons logo"><span class="button_text"> Commons</span></a>
                        <a title="Subject location" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 subject_location_button" style="display:none" target="_self"><span class="button_img">📍</span><span class="button_text"> Location</span></a>
                        <a title="Subject on Wikidata" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 wikidata_button"><img class="button_img" src="img/wikidata.svg" alt="Wikidata logo"><span class="button_text"> Wikidata</span></a>

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
            <span class="etymology_src_wrapper">
                Etymology source: 
                <a title="Etymology OpenStreetMap source" class="etymology_src_osm">OpenStreetMap</a>
                <span class="etymology_src_wd_wrapper">+ <a title="Etymology Wikidata source" class="etymology_src_wd">Wikidata</a></span>
            </span>
        </div>
    </template>
</body>

</html>