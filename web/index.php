<?php
require_once("./app/IniEnvConfiguration.php");
require_once("./app/PostGIS_PDO.php");
require_once("./funcs.php");

use \App\IniEnvConfiguration;
use App\PostGIS_PDO;

$conf = new IniEnvConfiguration();
prepareHTML($conf);

if (!$conf->has("maptiler_key")) {
    http_response_code(500);
    die('<html><body>Missing Maptiler key from configuration</body></html>');
}

$lastUpdateString = '';
$enableDB = $conf->getBool("db-enable");
if($enableDB) {
    try {
        $dbh = new PostGIS_PDO($conf);
        $lastUpdate = $dbh->query("SELECT oem.last_data_update()")->fetchColumn();
        $lastUpdateString = empty($lastUpdate) ? '' : "<p>Last data update: $lastUpdate</p>";
    } catch(Exception $e) {
        error_log("Error fetching last update: ".$e->getMessage());
    }
}

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

$useSentry = $conf->has('sentry-js-url');
$useGoogleAnalytics = $conf->has("google-analytics-id");

?>

<!DOCTYPE html>
<html lang="<?= $defaultCulture; ?>">

<head>
    <meta name="maptiler_key" content="<?=(string)$conf->get("maptiler_key");?>" />
    <meta name="default_center_lat" content="<?=(float)$conf->get("default-center-lat");?>" />
    <meta name="default_center_lon" content="<?=(float)$conf->get("default-center-lon");?>" />
    <meta name="default_zoom" content="<?=(int)$conf->get("default-zoom");?>" />
    <meta name="thresholdZoomLevel" content="<?=(int)$conf->get("threshold-zoom-level");?>" />
    <meta name="minZoomLevel" content="<?=(int)$conf->get("min-zoom-level");?>" />
    <meta name="defaultBackgroundStyle" content="<?=(string)$conf->get("default-background-style");?>" />
    <meta name="defaultColorScheme" content="<?=(string)$conf->get("default-color-scheme");?>" />
    <meta name="google_analytics_id" content="<?=$conf->has("google-analytics-id") ? (string)$conf->get("google-analytics-id") : '';?>" />
    <meta name="sentry_js_url" content="<?=$conf->has("sentry_js_url") ? (string)$conf->get("sentry-js-url") : '';?>" />
    <meta name="sentry_js_env" content="<?=$conf->has("sentry_js_env") ? (string)$conf->get("sentry-js-env") : '';?>" />

    <?php
    if ($useSentry) { 
        $sentryUrl = (string)$conf->get('sentry-js-url');
    ?>
        <link
            rel="preload"
            as="script"
            type="application/javascript"
            href="<?= $sentryUrl; ?>"
            crossorigin="anonymous" />
    <?php
    }

    if ($useGoogleAnalytics) { 
        $googleAnalyticsUrl = "https://www.googletagmanager.com/gtag/js?id=".$conf->get("google-analytics-id");
    ?>
        <link
            rel="preload"
            as="script"
            type="application/javascript"
            href="<?= $googleAnalyticsUrl; ?>" />
    <?php
    }
    ?>
    <link rel="preload" as="script" type="application/javascript" href="./init.js">
    <link rel="preload" as="script" type="application/javascript" href="./dist/main.js">
    <link rel="preload" as="style" type="text/css" href="./dist/main.css" />
    <link rel="preload" as="fetch" type="application/geo+json" href="./global-map.php" crossorigin="anonymous" />

    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">

    <?php if ($useSentry) { ?>
        <script src="<?= $sentryUrl; ?>" crossorigin="anonymous" ></script>
    <?php
    }

    if ($useGoogleAnalytics) {
    ?>
        <script async src="<?= $googleAnalyticsUrl; ?>"></script>
    <?php
    }
    ?>
    <script defer src="./init.js" type="application/javascript"></script>

    <title>Open Etymology Map</title>
    <meta name="description" content="Interactive map that shows the etymology of names of streets and points of interest based on OpenStreetMap and Wikidata." />

    <link rel="stylesheet" href="./dist/main.css" type="text/css" />

    <script defer src="./dist/main.js" type="application/javascript"></script>

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

            <?=$lastUpdateString;?>
            <p>
                <?= implode(" | ", [
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
            <a title="Element on Wikipedia" rel="noopener noreferrer" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 element_wikipedia_button" style="display:none">
                <img class="button_img" src="img/wikipedia.png" alt="Wikipedia logo">
                <span class="button_text"> Wikipedia</span>
            </a>
            <a title="Element on Wikimedia Commons" rel="noopener noreferrer" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 element_commons_button" style="display:none">
                <img class="button_img" src="img/commons.svg" alt="Wikimedia Commons logo">
                <span class="button_text"> Commons</span>
            </a>
            <a title="Element on Wikidata" rel="noopener noreferrer" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 element_wikidata_button" style="display:none">
                <img class="button_img" src="img/wikidata.svg" alt="Wikidata logo">
                <span class="button_text"> Wikidata</span>
            </a>
            <a title="Element on OpenStreetMap" rel="noopener noreferrer" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 element_osm_button">
                <img class="button_img" src="img/osm.svg" alt="OpenStreetMap logo">
                <span class="button_text"> OpenStreetMap</span>
            </a>
            <a title="Element on MapComplete" rel="noopener noreferrer" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 element_mapcomplete_button">
                <img class="button_img" src="img/mapcomplete.svg" alt="MapComplete logo">
                <span class="button_text"> Mapcomplete</span>
            </a>
            <a title="Element location" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 element_location_button" target="_self">
                <span class="button_img">📍</span>
                <span class="button_text"> Location</span>
            </a>

            <div class="etymologies_container grid grid-auto">

            </div>
            <a title="Report a problem in this element" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 ety_error_button" href="https://gitlab.com/openetymologymap/open-etymology-map/-/blob/main/CONTRIBUTING.md#how-to-report-a-problem-in-the-etymology-of-an-element">
                <span class="button_img">⚠️</span>
                <span>&nbsp;Report a problem in this element</span>
            </a>
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
                        <a title="Subject on Wikipedia" rel="noopener noreferrer" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 wikipedia_button" style="display:none">
                            <img class="button_img" src="img/wikipedia.png" alt="Wikipedia logo">
                            <span class="button_text"> Wikipedia</span>
                        </a>
                        <a title="Subject on Wikimedia Commons" rel="noopener noreferrer" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 commons_button" style="display:none">
                            <img class="button_img" src="img/commons.svg" alt="Wikimedia Commons logo">
                            <span class="button_text"> Commons</span>
                        </a>
                        <a title="Subject on Wikidata" rel="noopener noreferrer" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 wikidata_button">
                            <img class="button_img" src="img/wikidata.svg" alt="Wikidata logo">
                            <span class="button_text"> Wikidata</span>
                        </a>
                        <a title="Subject location" class="k-button w3-button w3-white w3-border w3-border w3-round-large button-6 subject_location_button" style="display:none" target="_self">
                            <span class="button_img">📍</span>
                            <span class="button_text"> Location</span>
                        </a>

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