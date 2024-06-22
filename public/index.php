<!DOCTYPE html>
<html>
<body>
    <template id="detail_template">
        <div class="detail_container">
            <h3 class="element_name"></h3>
            <p class="element_alt_names"></p>
            <p class="element_description"></p>
            <div class="feature_buttons_placeholder"></div>
            <div class="feature_pictures column"></div>

            <div class="etymologies_container grid grid-auto">
                <div class="etymology etymology_loading">
                    <h3 class="i18n_loading">Loading entities...</h3>
                </div>
            </div>

            <a title="Report a problem in this element" role="button" class="k-button w3-button w3-white w3-border w3-round-large button-6 ety_error_button title_i18n_report_problem" href="<?= (string)$conf->get("element_issue_url") ?>">
                <span class="button_img">⚠️</span> &nbsp;
                <span class="i18n_report_problem">Report a problem in this element</span>
            </a>

            <div class="feature_src_wrapper">
                <span class="i18n_source">Source:</span>
                <a class="feature_src_osm hiddenElement" href="https://www.openstreetmap.org">OpenStreetMap</a>
                <span class="src_osm_and_wd hiddenElement">&</span>
                <a class="feature_src_wd hiddenElement" href="https://www.wikidata.org">Wikidata</a>
            </div>
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
                            <a title="Wikipedia" role="button" class="k-button w3-button w3-white w3-border w3-round-large button-6 wikipedia_button hiddenElement">
                                <img class="button_img" src="img/Wikipedia-logo-v2.svg" alt="Wikipedia logo">
                                <span class="button_text"> Wikipedia</span>
                            </a>
                            <a title="Wikispore" role="button" class="k-button w3-button w3-white w3-border w3-round-large button-6 wikispore_button hiddenElement">
                                <img class="button_img" src="img/Wikispore_logo_without_text.svg" alt="Wikispore logo">
                                <span class="button_text"> Wikispore</span>
                            </a>
                            <a title="Wikimedia Commons" role="button" class="k-button w3-button w3-white w3-border w3-round-large button-6 commons_button hiddenElement">
                                <img class="button_img" src="img/Commons-logo.svg" alt="Wikimedia Commons logo">
                                <span class="button_text"> Commons</span>
                            </a>
                            <a title="Wikidata" role="button" class="k-button w3-button w3-white w3-border w3-round-large button-6 wikidata_button">
                                <img class="button_img" src="img/Wikidata.svg" alt="Wikidata logo">
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
                <span class="src_osm_plus_wd hiddenElement"> &gt; </span>
                <a class="etymology_src_wd hiddenElement" href="https://www.wikidata.org">Wikidata</a>
                <span class="etymology_propagated_wrapper hiddenElement">
                    &gt;
                    <a title="Description of the propagation mechanism" class="i18n_propagation title_i18n_propagation" href="<?= (string)$conf->get("propagation_docs_url") ?>">propagation</a>
                </span>
                <span class="etymology_src_part_of_wd_wrapper hiddenElement">
                    &gt;
                    <a class="etymology_src_part_of_wd">Wikidata</a>
                </span>
                &gt;
                <a class="etymology_src_entity" href="https://www.wikidata.org">Wikidata</a>
            </span>
            <div class="etymology_parts_container hiddenElement"></div>
        </div>
    </template>
</body>

</html>