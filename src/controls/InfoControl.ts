import { IControl, Map, Popup } from 'maplibre-gl';

// import { IControl, Map, Popup } from 'mapbox-gl';

import { loadTranslator, translateContent, translateAnchorTitle, getLanguage } from '../i18n';
import { getBoolConfig, getConfig } from '../config';

/**
 * Opens the information intro window
 */
function openInfoWindow(map: Map, showInstructions: boolean) {
    const intro_template = document.getElementById('intro_template');
    if (!(intro_template instanceof HTMLTemplateElement))
        throw new Error("Missing intro template");

    // const popupPosition = map.unproject([0, 0]),
    const popupPosition = map.getBounds().getSouthWest().toArray(),
        introDomElement = intro_template.content.cloneNode(true) as HTMLElement;

    translateContent(introDomElement, ".i18n_title", "title", "OSM-Wikidata Map Framework");
    translateContent(introDomElement, ".i18n_description", "description", "");
    if (showInstructions) {
        introDomElement.querySelector(".instructions_container")?.classList?.remove("hiddenElement");
        translateContent(introDomElement, ".i18n_click_anywhere", "info_box.click_anywhere", "Click anywhere on the map to explore");
        translateContent(introDomElement, ".i18n_use_controls", "info_box.use_controls", "Use the controls on the sides to see other data:");
        translateContent(introDomElement, ".i18n_to_see_statistics", "info_box.to_see_statistics", "to see statistics about elements (only at high zoom)");
        translateContent(introDomElement, ".i18n_to_choose_source", "info_box.to_choose_source", "to choose which data source to use");
        translateContent(introDomElement, ".i18n_to_view_data_table", "info_box.to_view_data_table", "to view data in a table (only at high zoom)");
        translateContent(introDomElement, ".i18n_to_change_background", "info_box.to_change_background", "to change the background map style");
        translateContent(introDomElement, ".i18n_to_open_again", "info_box.to_open_again", "to open again this popup");
        translateContent(introDomElement, ".i18n_to_overpass_query", "info_box.to_overpass_query", "to view the source OverpassQL query (only with Overpass sources)");
        translateContent(introDomElement, ".i18n_to_wikidata_query", "info_box.to_wikidata_query", "to view the source SPARQL query (only with Wikidata sources)");
    }
    translateContent(introDomElement, ".i18n_contribute", "info_box.contribute", "Contribute to the map");
    translateAnchorTitle(introDomElement, ".title_i18n_contribute", "info_box.contribute", "Contribute to the map");
    translateContent(introDomElement, ".i18n_based_on", "info_box.based_on", "Based on");
    translateContent(introDomElement, ".i18n_report_issue", "info_box.report_issue", "Report an issue");
    translateAnchorTitle(introDomElement, ".title_i18n_report_issue", "info_box.report_issue_title", "Report a problem or a bug of this application");
    translateContent(introDomElement, ".i18n_about_me", "info_box.about_me", "About me");
    translateAnchorTitle(introDomElement, ".title_i18n_about_me", "info_box.about_me_title", "Personal website of the author of OSM-Wikidata Map Framework");

    if (introDomElement.querySelector<HTMLElement>(".i18n_last_db_update"))
        translateContent(introDomElement, ".i18n_last_db_update", "info_box.last_db_update", "Last database update:");

    if (introDomElement.querySelector<HTMLElement>(".i18n_download_dataset")) {
        translateContent(introDomElement, ".i18n_download_dataset", "info_box.download_dataset", "Download as dataset");
        translateAnchorTitle(introDomElement, ".title_i18n_download_dataset", "info_box.download_dataset", "Download as dataset");
    }

    const popup = new Popup({
        closeButton: true,
        closeOnClick: true,
        closeOnMove: true,
        maxWidth: 'none',
        className: "owmf_info_popup"
    }).setLngLat(popupPosition)
        .setDOMContent(introDomElement)
        .addTo(map);

    setupDatasetButton(popup);
    translateDonateButton(popup);
    void getLastDBUpdateDate(popup);
}

function setupDatasetButton(popup: Popup) {
    const datasetButton = popup.getElement().querySelector<HTMLAnchorElement>("a.dataset_button"),
        pmtiles_base_url = getConfig("pmtiles_base_url");
    if (!datasetButton) {
        if (process.env.NODE_ENV === 'development') console.warn("Missing dataset button");
    } else if (pmtiles_base_url) {
        datasetButton.href = pmtiles_base_url + 'dataset.csv';
        datasetButton.classList.remove("hiddenElement");
    } else if (getBoolConfig("vector_tiles_enable")) {
        datasetButton.href = 'dataset.php';
        datasetButton.classList.remove("hiddenElement");
    } else {
        datasetButton.classList.add("hiddenElement");
    }
}

function translateDonateButton(popup: Popup) {
    const donateImg = popup.getElement().querySelector<HTMLInputElement>("input.paypal_donate_img"),
        lang = getLanguage();
    if (donateImg && lang && lang !== "en") {
        const originalUrl = donateImg.src,
            urlWithLang = originalUrl.replace("en_US", lang + "_" + lang.toUpperCase()),
            fallbackToOriginalUrl = () => donateImg.src = originalUrl;

        donateImg.addEventListener("error", fallbackToOriginalUrl, { once: true });
        donateImg.src = urlWithLang;
    }
}

async function getLastDBUpdateDate(popup: Popup) {
    const container = popup.getElement().querySelector<HTMLElement>(".last_db_update_container"),
        placeholder = container?.querySelector<HTMLSpanElement>(".last_db_update_placeholder");
    if (!container || !placeholder)
        return;

    const pmtilesBaseURL = getConfig("pmtiles_base_url");
    if (!pmtilesBaseURL)
        return;

    const dateURL = pmtilesBaseURL + "date.txt";
    try {
        const response = await fetch(dateURL);
        if (response.ok) {
            const text = await response.text(),
                date = text.trim();
            if (process.env.NODE_ENV === 'development') console.debug("Last DB update date fetched from date.txt:", { dateURL, date });
            if (date) {
                placeholder.innerText = date;
                container.classList.remove("hiddenElement");
            }
        } else {
            if (process.env.NODE_ENV === 'development') console.warn("Fetching date.txt failed", { dateURL, response });
        }
    } catch (e) {
        if (process.env.NODE_ENV === 'development') console.warn("Error while fetching date.txt", { dateURL, e });
    }
}

/**
 * Let the user re-open the info window.
 * 
 * Control implemented as ES6 class
 * @see https://maplibre.org/maplibre-gl-js/docs/API/interfaces/maplibregl.IControl/
 * @see https://docs.mapbox.com/mapbox-gl-js/api/markers/#icontrol
 */
class InfoControl implements IControl {
    onAdd(map: Map) {
        const container = document.createElement('div');
        container.className = 'maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl info-ctrl';

        const ctrlBtn = document.createElement('button');
        ctrlBtn.className = 'info-ctrl-button mapboxgl-ctrl-icon maplibregl-ctrl-icon';
        ctrlBtn.textContent = 'ℹ️';
        ctrlBtn.onclick = () => openInfoWindow(map, true);
        container.appendChild(ctrlBtn);

        void loadTranslator().then(t => {
            const title = t("info_box.open_popup", "Open the info popup");
            ctrlBtn.title = title;
            ctrlBtn.ariaLabel = title;
        });

        return container;
    }

    onRemove(map: Map): void {
        void map;
    }
}

export { openInfoWindow, InfoControl };