//import { Popup } from 'maplibre-gl';
import { IControl, Map, Popup } from 'mapbox-gl';

/**
 * Opens the information intro window
 */
function openInfoWindow(map: Map) {
    const intro_template = document.getElementById('intro_template');
    if (!(intro_template instanceof HTMLTemplateElement))
        throw new Error("Missing intro template");

    const popupPosition = map.unproject([0, 0]),
        introDomElement = intro_template.content.cloneNode(true) as HTMLElement;
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