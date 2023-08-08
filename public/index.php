<?php

declare(strict_types=1);
require_once(__DIR__ . "/funcs.php");

use \App\Config\IniEnvConfiguration;
use \App\PostGIS_PDO;

$conf = new IniEnvConfiguration();
prepareHTML($conf);

$lastUpdateString = '';
$enableDB = $conf->getBool("db_enable");
if ($enableDB) {
    try {
        $dbh = new PostGIS_PDO($conf);
        $lastUpdate = (string)$dbh->query("SELECT owmf.last_data_update()")->fetchColumn();
        $lastUpdateString = empty($lastUpdate) ? '' : "<p><span class=\"i18n_last_db_update\">Last database update:</span> $lastUpdate</p>";
    } catch (Exception $e) {
        error_log("Error fetching last update: " . $e->getMessage());
    }
}

if (!$conf->has("i18n_override"))
    throw new Exception("Missing i18n_override configuration");
$i18nOverride = $conf->getArray("i18n_override");
if (empty($i18nOverride))
    throw new Exception("Empty i18n_override configuration");
$defaultLanguage = (string)$conf->get("default_language");
if (empty($i18nOverride[$defaultLanguage]))
    throw new Exception("Missing i18n configuration for the default language ($defaultLanguage)");
$defaultNamespace = "app";
if (empty($i18nOverride[$defaultLanguage][$defaultNamespace]))
    throw new Exception("Missing i18n configuration for the default language ($defaultLanguage) and namespace ($defaultNamespace)");
$i18nStrings = (array)$i18nOverride[$defaultLanguage][$defaultNamespace];
$title = empty($i18nStrings["title"]) ? "" : (string)$i18nStrings["title"];
$description = empty($i18nStrings["description"]) ? "" : (string)$i18nStrings["description"];
$availableLanguages = [];
foreach ($i18nOverride as $lang => $langData) {
    if (!empty($langData[$defaultNamespace]["title"])) {
        $availableLanguages[] = (string)$lang;
    }
}

$canonicalURL = $conf->has("home_url") ? (string)$conf->get("home_url") : getCurrentURL();

$metaKeywords = $conf->has("keywords") ? '<meta name="keywords" content="' . (string)$conf->get("keywords") . '" />' : "";

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
    <meta name="author" content="Daniele Santini" />
    <meta name="robots" content="index, follow" />
    <?= $metaKeywords; ?>
    <link rel="canonical" href="<?= $canonicalURL; ?>" />
    <?php foreach ($availableLanguages as $lang) { ?>
        <link rel="alternate" hreflang="<?= $lang; ?>" href="<?= $canonicalURL; ?>?lang=<?= $lang; ?>" />
    <?php } ?>

    <link rel="icon" type="image/svg+xml" href="favicon.svg" />
    <link rel="icon" type="image/x-icon" sizes="32x32" href="favicon.ico" />
    <link rel="apple-touch-icon" type="image/svg+xml" href="favicon.svg" />
    <link rel="apple-touch-icon" type="image/png" href="apple-touch-icon.png" />

    <link rel="preload" href="locales/<?= (string)$conf->get("default_language"); ?>/common.json" as="fetch" crossorigin="anonymous" fetchpriority="low" />

    <?= $conf->getMetaTag("db_enable", true); ?>
    <?= $conf->getJsonScriptTag("osm_wikidata_keys", true); ?>
    <?= $conf->getJsonScriptTag("osm_wikidata_properties", true); ?>
    <?= $conf->getMetaTag("propagate_data", true); ?>
    <?= $conf->getMetaTag("wikidata_indirect_property", true); ?>
    <?= $conf->getMetaTag("wikidata_image_property", true); ?>
    <?= $conf->getMetaTag("mapbox_token", true); ?>
    <?= $conf->getMetaTag("maptiler_key", true); ?>
    <?= $conf->getMetaTag("enable_stadia_maps", true); ?>
    <?= $conf->getMetaTag("jawg_token", true); ?>
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
    <?= $conf->getJsonScriptTag("i18n_override", true); ?>
    <?= $conf->getMetaTag("default_language"); ?>
</head>

<body>
    <div id='map' class="hiddenElement"></div>
    <noscript>
        <strong>ERROR: you need Javascript enabled to run this web app</strong>
    </noscript>

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
                        <td class="i18n_to_see_statistics">to see statistics about elements (only at high zoom)</td>
                    </tr>
                    <tr>
                        <td>⚙️</td>
                        <td class="i18n_to_choose_source">to choose which data source to use (only at high zoom)</td>
                    </tr>
                    <tr>
                        <td><img src="https://upload.wikimedia.org/wikipedia/commons/c/c3/Overpass-turbo.svg" width="16" height="16" alt="Overpass Turbo logo" /></td>
                        <td class="i18n_to_overpass_query">to view the source OverpassQL query (only with the Overpass source at high zoom)</td>
                    </tr>
                    <tr>
                        <td><img src="https://upload.wikimedia.org/wikipedia/commons/1/1a/Wikidata_Query_Service_Favicon.svg" width="16" height="16" alt="Wikidata Query Service logo" /></td>
                        <td class="i18n_to_wikidata_query">to view the source SPARQL query (only with the Wikidata source at high zoom)</td>
                    </tr>
                    <tr>
                        <td>🌍</td>
                        <td class="i18n_to_change_background">to change the background map style</td>
                    </tr>
                    <tr>
                        <td>ℹ️</td>
                        <td class="i18n_to_open_again">to open again this popup</td>
                    </tr>
                </table>
            </div>
            <p>
                <a title="Contribute to the map" role="button" class="k-button w3-button w3-white w3-border w3-round-large button-6 contribute_button title_i18n_contribute" href="<?= (string)$conf->get("contributing_url") ?>">
                    <span class="button_img">📖</span> &nbsp;
                    <span class="i18n_contribute">Contribute to the map</span>
                </a>
                <?php if ($enableDB) { ?>
                    <a title="Download as dataset" role="button" class="k-button w3-button w3-white w3-border w3-round-large button-6 dataset_button title_i18n_download_dataset" href="dataset.php">
                        <span class="button_img">💾</span> &nbsp;
                        <span class="i18n_download_dataset">Download as dataset</span>
                    </a>
                <?php } ?>
            </p>

            <footer>
                <p><?= $lastUpdateString; ?></p>
                <p>
                    <span class="i18n_based_on">Based on</span>
                    <a target="_blank" title="OSM-Wikidata Map Framework" aria-label="OSM-Wikidata Map Framework" href="https://gitlab.com/openetymologymap/osm-wikidata-map-framework">OSM-Wikidata Map Framework</a>
                    <?= $conf->has("framework_image_tag") && $conf->get("framework_image_tag") != "latest" ? " " . (string)$conf->get("framework_image_tag") : ""; ?>
                </p>
                <p>
                    <?php if ($conf->has("issues_url")) { ?>
                        <a target="_blank" title="Report a problem or a bug" class="i18n_report_issue title_i18n_report_issue" href="<?= (string)$conf->get("issues_url") ?>">Report a problem</a>
                        |
                    <?php } ?>
                    <a target="_blank" title="Personal website of the author of OSM-Wikidata Map Framework" class="i18n_about_me title_i18n_about_me" href="https://www.dsantini.it/">About me</a>
                </p>

                <?php if ($conf->has("paypal_id")) { ?>
                    <form action="https://www.paypal.com/donate" method="post" target="_top">
                        <input type="hidden" name="business" value="<?= (string)$conf->get("paypal_id") ?>" />
                        <input type="hidden" name="no_recurring" value="0" />
                        <input type="hidden" name="item_name" value="This donation will help this project to stay up and running. Thank you!" />
                        <input type="hidden" name="currency_code" value="EUR" />
                        <input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif" border="0" name="submit" title="PayPal - The safer, easier way to pay online!" alt="Donate with PayPal button" class="paypal_donate_img" />
                        <img alt="" border="0" src="https://www.paypal.com/en_US/i/scr/pixel.gif" width="1" height="1" />
                    </form>
                <?php } ?>
            </footer>
        </div>
    </template>

    <template id="detail_template">
        <div class="detail_container">
            <h3 class="element_name"></h3>
            <p class="element_alt_names"></p>
            <div class="button_row">
                <a title="Wikipedia" rel="noopener noreferrer" role="button" class="k-button w3-button w3-white w3-border w3-round-large button-6 element_wikipedia_button hiddenElement">
                    <img class="button_img" src="https://upload.wikimedia.org/wikipedia/commons/8/80/Wikipedia-logo-v2.svg" alt="Wikipedia logo">
                    <span class="button_text"> Wikipedia</span>
                </a>
                <a title="Wikimedia Commons" rel="noopener noreferrer" role="button" class="k-button w3-button w3-white w3-border w3-round-large button-6 element_commons_button hiddenElement">
                    <img class="button_img" src="https://upload.wikimedia.org/wikipedia/commons/4/4a/Commons-logo.svg" alt="Wikimedia Commons logo">
                    <span class="button_text"> Commons</span>
                </a>
                <a title="Wikidata" role="button" class="k-button w3-button w3-white w3-border w3-round-large button-6 element_wikidata_button hiddenElement">
                    <img class="button_img" src="https://upload.wikimedia.org/wikipedia/commons/7/71/Wikidata.svg" alt="Wikidata logo">
                    <span class="button_text"> Wikidata</span>
                </a>
                <a title="OpenStreetMap" rel="noopener noreferrer" role="button" class="k-button w3-button w3-white w3-border w3-round-large button-6 element_osm_button">
                    <img class="button_img" src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Openstreetmap_logo.svg" alt="OpenStreetMap logo">
                    <span class="button_text"> OpenStreetMap</span>
                </a>
                <a title="MapComplete" rel="noopener noreferrer" role="button" class="k-button w3-button w3-white w3-border w3-round-large button-6 element_mapcomplete_button">
                    <img class="button_img" src="img/mapcomplete.svg" alt="MapComplete logo">
                    <span class="button_text"> Mapcomplete</span>
                </a>
                <a title="Location" role="button" class="k-button w3-button w3-white w3-border w3-round-large button-6 element_location_button  title_i18n_location" target="_self">
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
            <a title="Report a problem in this element" role="button" class="k-button w3-button w3-white w3-border w3-round-large button-6 ety_error_button title_i18n_report_problem" href="<?= (string)$conf->get("element_issue_url") ?>">
                <span class="button_img">⚠️</span> &nbsp;
                <span class="i18n_report_problem">Report a problem in this element</span>
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
                            <a title="Wikipedia" rel="noopener noreferrer" role="button" class="k-button w3-button w3-white w3-border w3-round-large button-6 wikipedia_button hiddenElement">
                                <img class="button_img" src="https://upload.wikimedia.org/wikipedia/commons/8/80/Wikipedia-logo-v2.svg" alt="Wikipedia logo">
                                <span class="button_text"> Wikipedia</span>
                            </a>
                            <a title="Wikimedia Commons" rel="noopener noreferrer" role="button" class="k-button w3-button w3-white w3-border w3-round-large button-6 commons_button hiddenElement">
                                <img class="button_img" src="https://upload.wikimedia.org/wikipedia/commons/4/4a/Commons-logo.svg" alt="Wikimedia Commons logo">
                                <span class="button_text"> Commons</span>
                            </a>
                            <a title="Wikidata" role="button" class="k-button w3-button w3-white w3-border w3-round-large button-6 wikidata_button">
                                <img class="button_img" src="https://upload.wikimedia.org/wikipedia/commons/7/71/Wikidata.svg" alt="Wikidata logo">
                                <span class="button_text"> Wikidata</span>
                            </a>
                            <a title="EntiTree" role="button" class="k-button w3-button w3-white w3-border w3-round-large button-6 entitree_button">
                                <img class="button_img" src="img/entitree.png" alt="EntiTree logo">
                                <span class="button_text"> EntiTree</span>
                            </a>
                            <a title="Location" role="button" class="k-button w3-button w3-white w3-border w3-round-large button-6 subject_location_button hiddenElement title_i18n_location" target="_self">
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
                <a class="etymology_src_osm hiddenElement" href="https://www.openstreetmap.org">OpenStreetMap</a>
                <span class="src_osm_plus_wd hiddenElement">+</span>
                <a class="etymology_src_wd hiddenElement">Wikidata</a>
                <span class="etymology_propagated_wrapper hiddenElement">
                    +
                    <a title="Description of the propagation mechanism" class="i18n_propagation title_i18n_propagation" href="<?= (string)$conf->get("propagation_docs_url") ?>">propagation</a>
                </span>
                <span class="etymology_src_part_of_wd_wrapper hiddenElement">
                    +
                    <a class="etymology_src_part_of_wd">Wikidata</a>
                </span> </span>
        </div>
    </template>
</body>

</html>