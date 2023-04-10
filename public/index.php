<?php

declare(strict_types=1);
require_once(__DIR__ . "/funcs.php");

use \App\Config\IniEnvConfiguration;
use \App\PostGIS_PDO;

$conf = new IniEnvConfiguration();
prepareHTML($conf);

$required_conf = ["mapbox_token"];
foreach ($required_conf as $key) {
    if (!$conf->has($key)) {
        http_response_code(500);
        die("<html><body>Missing $key from configuration</body></html>");
    }
}

$lastUpdateString = '';
$enableDB = $conf->getBool("db_enable");
if ($enableDB) {
    try {
        $dbh = new PostGIS_PDO($conf);
        $lastUpdate = (string)$dbh->query("SELECT oem.last_data_update()")->fetchColumn();
        $lastUpdateString = empty($lastUpdate) ? '' : "<p>Last database update: $lastUpdate</p>";
    } catch (Exception $e) {
        error_log("Error fetching last update: " . $e->getMessage());
    }
}

$i18nOverride = $conf->has("i18n_override") ? json_decode((string)$conf->get("i18n_override"), true) : null;
$title = empty($i18nOverride["en"][$_SERVER["HTTP_HOST"]]["title"]) ? "" : (string)$i18nOverride["en"][$_SERVER["HTTP_HOST"]]["title"];
$description = empty($i18nOverride["en"][$_SERVER["HTTP_HOST"]]["description"]) ? "" : (string)$i18nOverride["en"][$_SERVER["HTTP_HOST"]]["description"];

$thisURL = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";
$canonicalURL = $conf->has("home_url") ? $conf->get("home_url") : $thisURL;

?>

<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=10">

    <title><?= $title; ?></title>
    <meta name="description" content="<?= $description; ?>" />

    <?php if ($conf->has("google_analytics_id")) {
        $analyticsId = (string)$conf->get("google_analytics_id"); ?>
        <script defer src="<?= "https://www.googletagmanager.com/gtag/js?id=$analyticsId"; ?>"></script>
    <?php } ?>
    <script defer src="./dist/main.js" type="application/javascript"></script>
    <link rel="stylesheet" href="./dist/main.css" type="text/css" />

    <meta property="og:type" content="website" />
    <meta property="og:url" content="<?= $canonicalURL; ?>" />
    <meta property="og:title" content="<?= $title; ?>" />
    <meta property="og:site_name" content="<?= $title; ?>" />
    <meta property="og:description" content="<?= $description; ?>" />
    <meta name="author" content="Daniele Santini">
    <meta name="robots" content="index, follow" />
    <meta name="keywords" content="etymology, etymologie, etimoloji, hodonyms, odonymy, odonomastica, odonimia, odonimi, Straßenname, odónimo, odonymie, straatnaam, odoniemen, toponym, toponymy, toponimi, toponomastica, toponymie, Ortsname, OpenStreetMap, Wikidata, map, mappa, karte, open data, linked data, structured data, urban, city">
    <link rel="canonical" href="<?= $canonicalURL; ?>" />
    <link rel="icon" sizes="16x16" type="image/x-icon" href="./favicon.ico">
    <link rel="icon" sizes="32x32" type="image/png" href="./icons8-quest-32.png">
    <link rel="icon" sizes="96x96" type="image/png" href="./icons8-quest-96.png">
    <link rel="apple-touch-icon" sizes="16x16" type="image/x-icon" href="./favicon.ico">
    <link rel="apple-touch-icon" sizes="32x32" type="image/png" href="./icons8-quest-32.png">
    <link rel="apple-touch-icon" sizes="96x96" type="image/png" href="./icons8-quest-96.png">

    <?= $conf->getMetaTag("db_enable"); ?>
    <?= $conf->getMetaTag("osm_wikidata_keys", true); ?>
    <?= $conf->getMetaTag("osm_wikidata_properties", true); ?>
    <?= $conf->getMetaTag("propagate_data", true); ?>
    <?= $conf->getMetaTag("wikidata_indirect_property", true); ?>
    <?= $conf->getMetaTag("wikidata_image_property", true); ?>
    <?= $conf->getMetaTag("mapbox_token"); ?>
    <?= $conf->getMetaTag("maptiler_key", true); ?>
    <?= $conf->getMetaTag("default_center_lat"); ?>
    <?= $conf->getMetaTag("default_center_lon"); ?>
    <?= $conf->getMetaTag("default_zoom"); ?>
    <?= $conf->getMetaTag("threshold_zoom_level"); ?>
    <?= $conf->getMetaTag("min_zoom_level"); ?>
    <?= $conf->getMetaTag("default_background_style"); ?>
    <?= $conf->getMetaTag("default_color_scheme"); ?>
    <?= $conf->getMetaTag("default_source"); ?>
    <?= $conf->getMetaTag("google_analytics_id", true); ?>
    <?= $conf->getMetaTag("matomo_domain", true); ?>
    <?= $conf->getMetaTag("matomo_id", true); ?>
    <?= $conf->getMetaTag("sentry_js_dsn", true); ?>
    <?= $conf->getMetaTag("sentry_js_env", true); ?>
    <?= $conf->getMetaTag("sentry_js_replays_session_sample_rate", true); ?>
    <?= $conf->getMetaTag("sentry_js_replays_on_error_sample_rate", true); ?>
    <?= $conf->getMetaTag("bbox_margin", true); ?>
    <?= $conf->getMetaTag("enable_debug_log", true); ?>
    <?= $conf->getMetaTag("eager_full_etymology_download", true); ?>
    <?= $conf->getMetaTag("wikidata_endpoint", true); ?>
    <?= $conf->getMetaTag("show_feature_mapcomplete", true); ?>
    <?= $conf->getMetaTag("i18n_override", true); ?>
</head>

<body>
    <div id='map'></div>
    <noscript>
        <strong>ERROR: you need Javascript enabled to run this web app</strong>
    </noscript>
    <div id="snackbar"></div>

    <template id="intro_template">
        <div class="intro">
            <header>
                <h1 class="i18n_title"></h1>
                <p class="i18n_description"></p>
            </header>

            <p class="i18n_click_anywhere">Click anywhere on the map to explore.</p>
            <div>
                <span class="i18n_use_controls">Use the controls on the side to see other data:</span>
                <table>
                    <tr>
                        <td>📊</td>
                        <td class="i18n_to_see_statistics">to see statistics about elements</td>
                    </tr>
                    <tr>
                        <td>⚙️</td>
                        <td class="i18n_to_choose_source">to choose which data source to use</td>
                    </tr>
                    <tr>
                        <td>🌐</td>
                        <td class="i18n_to_change_background">to change the background map style</td>
                    </tr>
                    <tr>
                        <td>ℹ️</td>
                        <td class="i18n_to_open_again">to open again this popup</td>
                    </tr>
                </table>
            </div>
            <p>
                <a title="Contribute to the map" class="k-button w3-button w3-white w3-border w3-round-large button-6 contribute_button" href="<?= $conf->get("contributing_url") ?>">
                    <span class="button_img">📖</span>
                    <span class="i18n_contribute">Contribute to the map</span>
                </a>
                <?php if ($enableDB) { ?>
                    <a title="Download as dataset" class="k-button w3-button w3-white w3-border w3-round-large button-6 dataset_button" href="dataset.php">
                        <span class="button_img">💾</span>
                        <span class="i18n_download_dataset">Download as dataset</span>
                    </a>
                <?php } ?>
            </p>

            <footer>
                <p><?= $lastUpdateString; ?></p>
                <p>
                    <span class="i18n_based_on">Based on</span>
                    <a target="_blank" href="https://gitlab.com/openetymologymap/osm-wikidata-map-framework">OSM-Wikidata Map Framework</a>
                    <?= $conf->has("framework_image_tag") && $conf->get("framework_image_tag") != "latest" ? " " . $conf->get("framework_image_tag") : ""; ?>
                </p>
                <p>
                    <?php if ($conf->has("issues_url")) { ?>
                        <a target="_blank" title="Report a problem or a bug" class="i18n_report_issue title_i18n_report_issue" href="<?= $conf->get("issues_url") ?>">Report a problem</a>
                        |
                    <?php } ?>
                    <a target="_blank" title="Daniele Santini personal website" class="i18n_about_me title_i18n_about_me" href="https://www.dsantini.it/">About me</a>
                    |
                    <a target="_blank" href="https://icons8.com/icon/EiUNiE6hQ3RI/quest">Quest</a> icon by <a target="_blank" href="https://icons8.com">Icons8</a>
                </p>

                <?php if ($conf->has("paypal_id")) { ?>
                    <form action="https://www.paypal.com/donate" method="post" target="_top">
                        <input type="hidden" name="business" value="<?= $conf->get("paypal_id") ?>" />
                        <input type="hidden" name="no_recurring" value="0" />
                        <input type="hidden" name="item_name" value="This donation will help this project to stay up and running. Thank you!" />
                        <input type="hidden" name="currency_code" value="EUR" />
                        <input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif" border="0" name="submit" title="PayPal - The safer, easier way to pay online!" alt="Donate with PayPal button" />
                        <img alt="" border="0" src="https://www.paypal.com/en_US/i/scr/pixel.gif" width="1" height="1" />
                    </form>
                <?php } ?>
            </footer>
        </div>
    </template>

    <template id="detail_template">
        <div class="detail_container">
            <h3 class="element_name"></h3>
            <p class="element_alt_name"></p>
            <div class="button_row">
                <a title="Wikipedia" rel="noopener noreferrer" class="k-button w3-button w3-white w3-border w3-round-large button-6 element_wikipedia_button hiddenElement">
                    <img class="button_img" src="img/wikipedia.png" alt="Wikipedia logo">
                    <span class="button_text"> Wikipedia</span>
                </a>
                <a title="Wikimedia Commons" rel="noopener noreferrer" class="k-button w3-button w3-white w3-border w3-round-large button-6 element_commons_button hiddenElement">
                    <img class="button_img" src="img/commons.svg" alt="Wikimedia Commons logo">
                    <span class="button_text"> Commons</span>
                </a>
                <a title="Wikidata" class="k-button w3-button w3-white w3-border w3-round-large button-6 element_wikidata_button hiddenElement">
                    <img class="button_img" src="img/wikidata.svg" alt="Wikidata logo">
                    <span class="button_text"> Wikidata</span>
                </a>
                <a title="OpenStreetMap" rel="noopener noreferrer" class="k-button w3-button w3-white w3-border w3-round-large button-6 element_osm_button">
                    <img class="button_img" src="img/osm.svg" alt="OpenStreetMap logo">
                    <span class="button_text"> OpenStreetMap</span>
                </a>
                <a title="MapComplete" rel="noopener noreferrer" class="k-button w3-button w3-white w3-border w3-round-large button-6 element_mapcomplete_button">
                    <img class="button_img" src="img/mapcomplete.svg" alt="MapComplete logo">
                    <span class="button_text"> Mapcomplete</span>
                </a>
                <a title="Location" class="k-button w3-button w3-white w3-border w3-round-large button-6 element_location_button  title_i18n_location" target="_self">
                    <span class="button_img">🎯</span>
                    <span class="button_text i18n_location"> Location</span>
                </a>
            </div>
            <?php if ($conf->getBool("show_feature_picture")) { ?><div class="feature_pictures column"></div><?php } ?>

            <div class="etymologies_container grid grid-auto">
                <div class="etymology etymology_loading">
                    <h3 class="i18n_loading">Loading entities...</h3>
                </div>
            </div>
            <a title="Report a problem in this element" class="k-button w3-button w3-white w3-border w3-round-large button-6 ety_error_button" href="<?= $conf->get("element_issue_url") ?>">
                <span class="button_img">⚠️</span>
                <span class="i18n_report_problem">&nbsp;Report a problem in this element</span>
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
                        <div class="button_row">
                            <a title="Wikipedia" rel="noopener noreferrer" class="k-button w3-button w3-white w3-border w3-round-large button-6 wikipedia_button hiddenElement">
                                <img class="button_img" src="img/wikipedia.png" alt="Wikipedia logo">
                                <span class="button_text"> Wikipedia</span>
                            </a>
                            <a title="Wikimedia Commons" rel="noopener noreferrer" class="k-button w3-button w3-white w3-border w3-round-large button-6 commons_button hiddenElement">
                                <img class="button_img" src="img/commons.svg" alt="Wikimedia Commons logo">
                                <span class="button_text"> Commons</span>
                            </a>
                            <a title="Wikidata" class="k-button w3-button w3-white w3-border w3-round-large button-6 wikidata_button">
                                <img class="button_img" src="img/wikidata.svg" alt="Wikidata logo">
                                <span class="button_text"> Wikidata</span>
                            </a>
                            <a title="EntiTree" class="k-button w3-button w3-white w3-border w3-round-large button-6 entitree_button">
                                <img class="button_img" src="img/entitree.png" alt="EntiTree logo">
                                <span class="button_text"> EntiTree</span>
                            </a>
                            <a title="Location" class="k-button w3-button w3-white w3-border w3-round-large button-6 subject_location_button hiddenElement title_i18n_location" target="_self">
                                <span class="button_img">🎯</span>
                                <span class="button_text i18n_location"> Location</span>
                            </a>
                        </div>

                        <p class="wikipedia_extract"></p>
                        <p class="start_end_date"></p>
                        <p class="event_place"></p>
                        <p class="citizenship"></p>
                        <p class="gender"></p>
                        <p class="occupations"></p>
                        <p class="prizes"></p>
                    </div>
                </div>

                <div class="ety_pictures column"></div>
            </div>
            <span class="etymology_src_wrapper">
                <span class="i18n_source">Source:</span>
                <a title="Etymology OpenStreetMap source" class="etymology_src_osm hiddenElement" href="https://www.openstreetmap.org">OpenStreetMap</a>
                <span class="src_osm_plus_wd hiddenElement">&nbsp;+&nbsp;</span>
                <a title="Etymology Wikidata source" class="etymology_src_wd hiddenElement">Wikidata</a>
                <span class="etymology_propagated_wrapper hiddenElement"> + <a title="Description of the propagation mechanism" href="<?= $conf->get("propagation_docs_url") ?>">propagation</a></span>
                <span class="etymology_src_part_of_wd_wrapper hiddenElement"> + <a title="Etymology Wikidata source" class="etymology_src_part_of_wd">Wikidata</a></span>
            </span>
        </div>
    </template>
</body>

</html>