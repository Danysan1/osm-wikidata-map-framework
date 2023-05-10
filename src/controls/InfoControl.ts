//import { Popup } from 'maplibre-gl';
import { IControl, Map, Popup } from 'mapbox-gl';
import { loadTranslator, translateContent, translateTitle } from '../i18n';

/**
 * Opens the information intro window
 */
function openInfoWindow(map: Map) {
    const intro_template = document.getElementById('intro_template');
    if (!(intro_template instanceof HTMLTemplateElement))
        throw new Error("Missing intro template");

    const popupPosition = map.unproject([0, 0]),
        introDomElement = intro_template.content.cloneNode(true) as HTMLElement;

    translateContent(introDomElement, ".i18n_title", "title");
    translateContent(introDomElement, ".i18n_description", "description");
    translateContent(introDomElement, ".i18n_click_anywhere", "info_box.click_anywhere");
    translateContent(introDomElement, ".i18n_use_controls", "info_box.use_controls");
    translateContent(introDomElement, ".i18n_to_see_statistics", "info_box.to_see_statistics");
    translateContent(introDomElement, ".i18n_to_choose_source", "info_box.to_choose_source");
    translateContent(introDomElement, ".i18n_to_change_background", "info_box.to_change_background");
    translateContent(introDomElement, ".i18n_to_open_again", "info_box.to_open_again");
    translateContent(introDomElement, ".i18n_contribute", "info_box.contribute");
    translateTitle(introDomElement, ".title_i18n_contribute", "info_box.contribute");
    translateContent(introDomElement, ".i18n_based_on", "info_box.based_on");
    translateContent(introDomElement, ".i18n_report_issue", "info_box.report_issue");
    translateTitle(introDomElement, ".title_i18n_report_issue", "info_box.report_issue_title");
    translateContent(introDomElement, ".i18n_about_me", "info_box.about_me");
    translateTitle(introDomElement, ".title_i18n_about_me", "info_box.about_me_title");

    if (introDomElement.querySelector<HTMLElement>(".i18n_last_db_update"))
        translateContent(introDomElement, ".i18n_last_db_update", "info_box.last_db_update");

    if (introDomElement.querySelector<HTMLElement>(".i18n_download_dataset")) {
        translateContent(introDomElement, ".i18n_download_dataset", "info_box.download_dataset");
        translateTitle(introDomElement, ".title_i18n_download_dataset", "info_box.download_dataset");
    }

    new Popup({
        closeButton: true,
        closeOnClick: true,
        closeOnMove: true,
        maxWidth: 'none',
        className: "oem_info_popup"
    }).setLngLat(popupPosition)
        .setDOMContent(introDomElement)
        .addTo(map);
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
            const title = t("info_box.open_popup");
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