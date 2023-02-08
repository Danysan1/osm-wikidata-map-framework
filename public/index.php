<?php
require_once(__DIR__ . "/../app/config/IniEnvConfiguration.php");
require_once(__DIR__ . "/../app/PostGIS_PDO.php");
require_once("./funcs.php");

use \App\IniEnvConfiguration;
use App\PostGIS_PDO;

$conf = new IniEnvConfiguration();
prepareHTML($conf);

if (!$conf->has("mapbox_token")) {
    http_response_code(500);
    die('<html><body>Missing Mapbox token from configuration</body></html>');
}

$lastUpdateString = '';
$enableDB = $conf->getDbEnable();
if ($enableDB) {
    try {
        $dbh = new PostGIS_PDO($conf);
        $lastUpdate = (string)$dbh->query("SELECT oem.last_data_update()")->fetchColumn();
        $lastUpdateString = empty($lastUpdate) ? '' : "<p>Last data update: $lastUpdate</p>";
    } catch (Exception $e) {
        error_log("Error fetching last update: " . $e->getMessage());
    }
}

$langMatches = [];
if (
    !empty($_REQUEST['lang'])
    && is_string($_REQUEST['lang'])
    && preg_match(ISO_LANGUAGE_PATTERN, $_REQUEST['lang'])
) {
    $defaultCulture = $_REQUEST['lang'];
} elseif (
    !empty($_SERVER['HTTP_ACCEPT_LANGUAGE'])
    && is_string($_SERVER['HTTP_ACCEPT_LANGUAGE'])
    && preg_match("/(\w+)(-\w+)?/", $_SERVER['HTTP_ACCEPT_LANGUAGE'], $langMatches)
    && isset($langMatches[0])
) {
    $defaultCulture = $langMatches[0];
} elseif ($conf->has('default_language')) {
    $defaultCulture = (string)$conf->get('default_language');
} else {
    $defaultCulture = "en-US";
}

?>

<!DOCTYPE html>
<html lang="<?= $defaultCulture; ?>">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">

    <title>Open Etymology Map</title>
    <meta name="description" content="Interactive map that shows the etymology of names of streets and points of interest based on OpenStreetMap and Wikidata." />

    <?php if ($conf->has("google_analytics_id")) {
        $analyticsId = (string)$conf->get("google_analytics_id"); ?>
        <script defer src="<?= "https://www.googletagmanager.com/gtag/js?id=$analyticsId"; ?>"></script>
    <?php } ?>
    <script defer src="./dist/main.js" type="application/javascript"></script>
    <link rel="stylesheet" href="./dist/main.css" type="text/css" />

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
    <link rel="icon" sizes="16x16" type="image/x-icon" href="./favicon.ico">
    <link rel="icon" sizes="32x32" type="image/png" href="./icons8-quest-32.png">
    <link rel="icon" sizes="96x96" type="image/png" href="./icons8-quest-96.png">

    <?= $conf->getDbEnableMetaTag(); ?>
    <?= $conf->getMetaTag("mapbox_token"); ?>
    <?= $conf->getMetaTag("maptiler_key", true); ?>
    <?= $conf->getMetaTag("default_center_lat"); ?>
    <?= $conf->getMetaTag("default_center_lon"); ?>
    <?= $conf->getMetaTag("default_zoom"); ?>
    <?= $conf->getMetaTag("threshold_zoom_level"); ?>
    <?= $conf->getMetaTag("min_zoom_level"); ?>
    <?= $conf->getMetaTag("default_background_style"); ?>
    <?= $conf->getMetaTag("default_color_scheme"); ?>
    <?= $conf->getMetaTag("google_analytics_id", true); ?>
    <?= $conf->getMetaTag("matomo_domain", true); ?>
    <?= $conf->getMetaTag("matomo_id", true); ?>
    <?= $conf->getMetaTag("sentry_js_dsn", true); ?>
    <?= $conf->getMetaTag("sentry_js_env", true); ?>
    <?= $conf->getMetaTag("sentry_js_replays_session_sample_rate", true); ?>
    <?= $conf->getMetaTag("sentry_js_replays_on_error_sample_rate", true); ?>
    <?= $conf->getMetaTag("bbox_margin", true); ?>
    <?= $conf->getMetaTag("enable_debug_log", true); ?>
</head>

<body>
    <div id="map_container">
        <div id='map'></div>
        <div id="intro">
            <h1>Open Etymology Map</h1>
            <p>Interactive map that shows the etymology of names of streets and points of interest based on OpenStreetMap and Wikidata.</p>

            <a title="Contribute to the map" class="k-button w3-button w3-white w3-border w3-round-large button-6 contribute_button" href="https://gitlab.com/openetymologymap/open-etymology-map/-/blob/main/CONTRIBUTING.md#how-to-contribute-to-the-etymology-data"><span class="button_img">📖</span> Contribute to the map</a>

            <?php if ($enableDB) { ?> <a title="Download as dataset" class="k-button w3-button w3-white w3-border w3-round-large button-6 dataset_button" href="dataset.php"><span class="button_img">💾</span> Download as dataset</a> <?php } ?>

            <?= $lastUpdateString; ?>
            <p>
                <a target="_blank" title="Report a problem in Open Etymology Map" href="https://gitlab.com/openetymologymap/open-etymology-map/-/issues">Report a problem</a>
                |
                <a target="_blank" title="Daniele Santini personal website" href="https://www.dsantini.it/">About me</a>
                |
                <a target="_blank" href="https://icons8.com/icon/EiUNiE6hQ3RI/quest">Quest</a> icon by <a target="_blank" href="https://icons8.com">Icons8</a>
            </p>
            <form action="https://www.paypal.com/donate" method="post" target="_top">
                <input type="hidden" name="business" value="NA5HL6EM9LDJ6" />
                <input type="hidden" name="no_recurring" value="0" />
                <input type="hidden" name="item_name" value="This donation will help Open Etymology Map to stay up and running. Thank you!" />
                <input type="hidden" name="currency_code" value="EUR" />
                <input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif" border="0" name="submit" title="PayPal - The safer, easier way to pay online!" alt="Donate with PayPal button" />
                <img alt="" border="0" src="https://www.paypal.com/en_US/i/scr/pixel.gif" width="1" height="1" />
            </form>
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
            <p class="element_alt_name"></p>
            <a title="Element on Wikipedia" rel="noopener noreferrer" class="k-button w3-button w3-white w3-border w3-round-large button-6 element_wikipedia_button" style="display:none">
                <img class="button_img" src="img/wikipedia.png" alt="Wikipedia logo">
                <span class="button_text"> Wikipedia</span>
            </a>
            <a title="Element on Wikimedia Commons" rel="noopener noreferrer" class="k-button w3-button w3-white w3-border w3-round-large button-6 element_commons_button" style="display:none">
                <img class="button_img" src="img/commons.svg" alt="Wikimedia Commons logo">
                <span class="button_text"> Commons</span>
            </a>
            <a title="Element on Wikidata" rel="noopener noreferrer" class="k-button w3-button w3-white w3-border w3-round-large button-6 element_wikidata_button" style="display:none">
                <img class="button_img" src="img/wikidata.svg" alt="Wikidata logo">
                <span class="button_text"> Wikidata</span>
            </a>
            <a title="Element on OpenStreetMap" rel="noopener noreferrer" class="k-button w3-button w3-white w3-border w3-round-large button-6 element_osm_button">
                <img class="button_img" src="img/osm.svg" alt="OpenStreetMap logo">
                <span class="button_text"> OpenStreetMap</span>
            </a>
            <a title="Element on MapComplete" rel="noopener noreferrer" class="k-button w3-button w3-white w3-border w3-round-large button-6 element_mapcomplete_button">
                <img class="button_img" src="img/mapcomplete.svg" alt="MapComplete logo">
                <span class="button_text"> Mapcomplete</span>
            </a>
            <a title="Element location" class="k-button w3-button w3-white w3-border w3-round-large button-6 element_location_button" target="_self">
                <span class="button_img">📍</span>
                <span class="button_text"> Location</span>
            </a>

            <div class="etymologies_container grid grid-auto">

            </div>
            <a title="Report a problem in this element" class="k-button w3-button w3-white w3-border w3-round-large button-6 ety_error_button" href="https://gitlab.com/openetymologymap/open-etymology-map/-/blob/main/CONTRIBUTING.md#how-to-report-a-problem-in-the-etymology-of-an-element">
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
                        <a title="Subject on Wikipedia" rel="noopener noreferrer" class="k-button w3-button w3-white w3-border w3-round-large button-6 wikipedia_button" style="display:none">
                            <img class="button_img" src="img/wikipedia.png" alt="Wikipedia logo">
                            <span class="button_text"> Wikipedia</span>
                        </a>
                        <a title="Subject on Wikimedia Commons" rel="noopener noreferrer" class="k-button w3-button w3-white w3-border w3-round-large button-6 commons_button" style="display:none">
                            <img class="button_img" src="img/commons.svg" alt="Wikimedia Commons logo">
                            <span class="button_text"> Commons</span>
                        </a>
                        <a title="Subject on Wikidata" rel="noopener noreferrer" class="k-button w3-button w3-white w3-border w3-round-large button-6 wikidata_button">
                            <img class="button_img" src="img/wikidata.svg" alt="Wikidata logo">
                            <span class="button_text"> Wikidata</span>
                        </a>
                        <a title="Subject location" class="k-button w3-button w3-white w3-border w3-round-large button-6 subject_location_button" style="display:none" target="_self">
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
                <span class="etymology_src_wd_wrapper"> + <a title="Etymology Wikidata source" class="etymology_src_wd">Wikidata</a></span>
                <span class="etymology_propagated"> + <a title="Description of the propagation mechanism" href="https://gitlab.com/openetymologymap/open-etymology-map/-/blob/main/CONTRIBUTING.md#propagation">propagation</a></span>
                <span class="etymology_src_part_of_wd_wrapper"> + <a title="Etymology Wikidata source" class="etymology_src_part_of_wd">Wikidata</a></span>
            </span>
        </div>
    </template>
</body>

</html>