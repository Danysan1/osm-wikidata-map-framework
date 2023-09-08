import { IControl, Map, Popup } from 'maplibre-gl';

// import { IControl, Map, Popup } from 'mapbox-gl';

import { getLocale, loadTranslator, translateContent, translateAnchorTitle } from '../i18n';

/**
 * Opens the information intro window
 */
function openInfoWindow(map: Map) {
    const intro_template = document.getElementById('intro_template');
    if (!(intro_template instanceof HTMLTemplateElement))
        throw new Error("Missing intro template");

    const popupPosition = map.unproject([0, 0]),
        introDomElement = intro_template.content.cloneNode(true) as HTMLElement;

    translateContent(introDomElement, ".i18n_title", "title", "OSM-Wikidata Map Framework");
    translateContent(introDomElement, ".i18n_description", "description", "");
    translateContent(introDomElement, ".i18n_click_anywhere", "info_box.click_anywhere", "Click anywhere on the map to explore");
    translateContent(introDomElement, ".i18n_use_controls", "info_box.use_controls", "Use the controls on the sides to see other data:");
    translateContent(introDomElement, ".i18n_to_see_statistics", "info_box.to_see_statistics", "to see statistics about elements");
    translateContent(introDomElement, ".i18n_to_choose_source", "info_box.to_choose_source", "to choose which data source to use");
    translateContent(introDomElement, ".i18n_to_change_background", "info_box.to_change_background", "to change the background map style");
    translateContent(introDomElement, ".i18n_to_open_again", "info_box.to_open_again", "to open again this popup");
    translateContent(introDomElement, ".i18n_to_overpass_query", "info_box.to_overpass_query", "to view the source OverpassQL query");
    translateContent(introDomElement, ".i18n_to_wikidata_query", "info_box.to_wikidata_query", "to view the source SPARQL query");
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

    const donateImg = popup.getElement().querySelector<HTMLInputElement>("input.paypal_donate_img");
    if (donateImg) {
        const locale = getLocale(),
            lang = document.documentElement.lang,
            originalUrl = donateImg.src,
            urlWithLang = originalUrl.replace("en_US", lang + "_" + lang.toUpperCase()),
            onUrlWithLangFailed = () => donateImg.src = originalUrl,
            onUrlWithLocaleFailed = () => {
                donateImg.addEventListener("error", onUrlWithLangFailed, { once: true });
                donateImg.src = urlWithLang;
            };
        if (locale) {
            const urlWithLocale = originalUrl.replace("en_US", locale.replace("-", "_"));
            donateImg.addEventListener("error", onUrlWithLocaleFailed, { once: true });
            donateImg.src = urlWithLocale;
        } else {
            onUrlWithLocaleFailed();
        }
    }
}

/**
 * Let the user re-open the info window.
 * 
 * Control implemented as ES6 class
 * @see https://docs.mapbox.com/mapbox-gl-js/api/markers/#icontrol
 */
class InfoControl implements IControl {
    onAdd(map: Map) {
        const container = document.createElement('div');
        container.className = 'maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl info-ctrl';

        const ctrlBtn = document.createElement('button');
        ctrlBtn.className = 'info-ctrl-button mapboxgl-ctrl-icon maplibregl-ctrl-icon';
        ctrlBtn.textContent = 'ℹ️';
        ctrlBtn.onclick = () => openInfoWindow(map);
        container.appendChild(ctrlBtn);

        loadTranslator().then(t => {
            const title = t("info_box.open_popup", "Open the info popup");
            ctrlBtn.title = title;
            ctrlBtn.ariaLabel = title;
        });

        return container;
    }

    onRemove(map: Map): void {
        //
    }
}

export { openInfoWindow, InfoControl };