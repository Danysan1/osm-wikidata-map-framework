//import { Popup } from 'maplibre-gl';
import { IControl, Map, Popup } from 'mapbox-gl';
import { t } from "i18next";

/**
 * Opens the information intro window
 */
function openInfoWindow(map: Map) {
    const intro_template = document.getElementById('intro_template');
    if (!(intro_template instanceof HTMLTemplateElement))
        throw new Error("Missing intro template");

    const popupPosition = map.unproject([0, 0]),
        introDomElement = intro_template.content.cloneNode(true) as HTMLElement,
        title = introDomElement.querySelector('.title'),
        description = introDomElement.querySelector('.description'),
        click_anywhere = introDomElement.querySelector('.click_anywhere'),
        use_controls = introDomElement.querySelector('.use_controls'),
        to_see_statistics = introDomElement.querySelector('.to_see_statistics'),
        to_choose_source = introDomElement.querySelector('.to_choose_source'),
        to_change_background = introDomElement.querySelector('.to_change_background'),
        to_open_again = introDomElement.querySelector('.to_open_again'),
        contribute = introDomElement.querySelector('.contribute'),
        download_dataset = introDomElement.querySelector('.download_dataset');

    if (title) title.textContent = t('info_box.title');
    if (description) description.textContent = t('info_box.description');
    if (click_anywhere) click_anywhere.textContent = t('info_box.click_anywhere');
    if (use_controls) use_controls.textContent = t('info_box.use_controls');
    if (to_see_statistics) to_see_statistics.textContent = t('info_box.to_see_statistics');
    if (to_choose_source) to_choose_source.textContent = t('info_box.to_choose_source');
    if (to_change_background) to_change_background.textContent = t('info_box.to_change_background');
    if (to_open_again) to_open_again.textContent = t('info_box.to_open_again');
    if (contribute) contribute.textContent = t('info_box.contribute');
    if (download_dataset) download_dataset.textContent = t('info_box.download_dataset');

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
        ctrlBtn.title = 'Show the info popup';
        ctrlBtn.textContent = 'ℹ️';
        ctrlBtn.onclick = () => openInfoWindow(map);
        container.appendChild(ctrlBtn);

        return container;
    }

    onRemove(map: Map): void {
        //
    }
}

export { openInfoWindow, InfoControl };