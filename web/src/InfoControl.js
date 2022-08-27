//import { Map, Popup } from 'maplibre-gl';
import { Map, Popup } from 'mapbox-gl';

/**
 * Opens the information intro window
 * 
 * @param {Map} map 
 */
 function openInfoWindow(map) {
    new Popup({
            closeButton: true,
            closeOnClick: true,
            closeOnMove: true,
            maxWidth: 'none',
            className: "oem_info_popup"
        }).setLngLat(map.getBounds().getNorthWest())
        .setDOMContent(document.getElementById("intro").cloneNode(true))
        .addTo(map);
}

/**
 * Let the user re-open the info window.
 * 
 * Control implemented as ES6 class
 * @see https://docs.mapbox.com/mapbox-gl-js/api/markers/#icontrol
 */
 class InfoControl {
    onAdd(map) {
        const container = document.createElement('div');
        container.className = 'maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl info-ctrl';

        const ctrlBtn = document.createElement('button');
        ctrlBtn.className = 'info-ctrl-button';
        ctrlBtn.title = 'Info about Open Etymology Map';
        ctrlBtn.textContent = 'ℹ️';
        ctrlBtn.onclick = () => openInfoWindow(map);
        container.appendChild(ctrlBtn);

        return container;
    }
}

export {openInfoWindow, InfoControl};