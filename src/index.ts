/* import maplibregl, { supported, setRTLTextPlugin, IControl } from 'maplibre-gl';
import { MaptilerGeocoderControl } from './MaptilerGeocoderControl';
import 'maplibre-gl/dist/maplibre-gl.css'; */

import mapboxgl, { supported, setRTLTextPlugin, IControl } from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import 'mapbox-gl/dist/mapbox-gl.css';

import { EtymologyMap } from './EtymologyMap';
import { logErrorMessage, initSentry, initGoogleAnalytics, initMatomo } from './monitoring';
import { BackgroundStyle, maptilerBackgroundStyle, mapboxBackgroundStyle } from './controls/BackgroundStyleControl';
import { debugLog, getConfig } from './config';
import { setPageLocale } from './i18n';
import './style.css';

initSentry();
initGoogleAnalytics();
initMatomo();

setPageLocale();

const maptiler_key = getConfig("maptiler_key"),
    mapbox_token = getConfig("mapbox_token"),
    backgroundStyles: BackgroundStyle[] = [];

if (mapbox_token) {
    backgroundStyles.push(
        mapboxBackgroundStyle('mapbox_streets', 'Mapbox Streets', 'mapbox', 'streets-v11', mapbox_token),
        mapboxBackgroundStyle('mapbox_outdoors', 'Mapbox Outdoors', 'mapbox', 'outdoors-v11', mapbox_token),
        mapboxBackgroundStyle('mapbox_light', 'Mapbox Light', 'mapbox', 'light-v10', mapbox_token),
        mapboxBackgroundStyle('mapbox_dark', 'Mapbox Dark', 'mapbox', 'dark-v10', mapbox_token),
        mapboxBackgroundStyle('mapbox_satellite_streets', 'Mapbox Satellite', 'mapbox', 'satellite-streets-v11', mapbox_token),
    );
}

if (maptiler_key) {
    backgroundStyles.push(
        maptilerBackgroundStyle('maptiler_streets', 'Maptiler Streets', 'streets', maptiler_key),
        maptilerBackgroundStyle('maptiler_bright', 'Maptiler Bright', 'bright', maptiler_key),
        maptilerBackgroundStyle('maptiler_hybrid', 'Maptiler Satellite', 'hybrid', maptiler_key),
        maptilerBackgroundStyle('maptiler_outdoors', 'Maptiler Outdoors', 'outdoor', maptiler_key),
        maptilerBackgroundStyle('maptiler_osm_carto', 'Maptiler OSM Carto', 'openstreetmap', maptiler_key),
    );
}

document.addEventListener("DOMContentLoaded", initPage);


/**
 * Initializes the map
 * @see https://docs.maptiler.com/maplibre-gl-js/tutorials/
 * @see https://docs.mapbox.com/help/tutorials/?product=Mapbox+GL+JS
 * @see https://docs.mapbox.com/mapbox-gl-js/example/disable-rotation/
 */
function initMap() {
    debugLog("Initializing the map");

    if (typeof mapboxgl == 'object' && typeof mapbox_token == 'string') {
        mapboxgl.accessToken = mapbox_token;
    }

    // https://maplibre.org/maplibre-gl-js-docs/example/mapbox-gl-rtl-text/
    setRTLTextPlugin(
        'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js',
        err => err ? console.error("Error loading mapbox-gl-rtl-text", err) : debugLog("mapbox-gl-rtl-text loaded"),
        true // Lazy load the plugin
    );

    let geocoderControl: IControl | null;
    if (typeof mapboxgl == 'object' && typeof MapboxGeocoder == 'function' && typeof mapbox_token == 'string') {
        debugLog("Using MapboxGeocoder", { mapboxgl, MapboxGeocoder, mapbox_token });
        const ctrl = new MapboxGeocoder({
            accessToken: mapbox_token,
            collapsed: true,
            language: document.documentElement.lang,
            mapboxgl: mapboxgl
        });
        geocoderControl = ctrl;
        document.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key == "f") {
                ctrl.clear();
                e.preventDefault();
            }
        });
    } /*else if (typeof maplibregl == 'object' && typeof MaptilerGeocoderControl == 'function' && typeof maptiler_key == 'string') {
        debugLog("Using MaptilerGeocoderControl", { maplibregl, MaptilerGeocoderControl, maptiler_key });
        geocoderControl = new MaptilerGeocoderControl(maptiler_key);
    }*/ else {
        geocoderControl = null;
        console.warn("No geocoding plugin available");
    }

    new EtymologyMap('map', backgroundStyles, geocoderControl);
}


/**
 * 
 * @see https://maplibre.org/maplibre-gl-js-docs/example/check-for-support/
 * @see https://docs.mapbox.com/mapbox-gl-js/example/check-for-support/
 */
function initPage() {
    if (!supported()) {
        const errorMessage = document.createElement("strong");
        errorMessage.innerHTML = 'Your browser does not support Mapbox GL JS, which is needed to render the map. You can find out the minimum requirements <a href="https://docs.mapbox.com/help/troubleshooting/mapbox-browser-support/">here</a>.';
        document.body.appendChild(errorMessage);

        logErrorMessage("Device/Browser does not support Mapbox GL JS");
    } else {
        document.getElementById("map")?.classList.remove("hiddenElement");
        initMap();
    }

    Array.from(document.getElementsByClassName("dataset_button")).forEach(
        (element) => element.addEventListener("click", () => setTimeout(() => alert(
            'Your download will start soon. ' +
            'This dataset is derived from OpenStreetMap and Wikidata and distributed under the Open Data Commons Open Database License (ODbL). ' +
            'You are free to copy, distribute, transmit and adapt our data, as long as you credit OpenStreetMap and its contributors. ' +
            'If you alter or build upon our data, you may distribute the result only under the same licence. ' +
            'Find out more at https://www.openstreetmap.org/copyright . '
        ), 1))
    );
}
