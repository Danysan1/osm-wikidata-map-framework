import { IControl, RequestTransformFunction } from 'maplibre-gl';
import { GeocodingControl } from "@maptiler/geocoding-control/maplibregl";
import "@maptiler/geocoding-control/style.css";
import { isMapboxURL, transformMapboxUrl } from 'maplibregl-mapbox-request-transformer'

// import { default as mapLibrary, setRTLTextPlugin, IControl, RequestTransformFunction } from 'mapbox-gl';
// import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
// import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';

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

let requestTransformFunc: RequestTransformFunction | undefined;
const maptiler_key = getConfig("maptiler_key"),
    mapbox_token = getConfig("mapbox_token"),
    backgroundStyles: BackgroundStyle[] = [];

if (mapbox_token) {
    backgroundStyles.push(
        mapboxBackgroundStyle('mapbox_streets', 'Mapbox Streets', 'mapbox', 'streets-v11', mapbox_token),
        mapboxBackgroundStyle('mapbox_streets_globe', 'Mapbox Streets (globe)', 'mapbox', 'streets-v12', mapbox_token),
        mapboxBackgroundStyle('mapbox_outdoors', 'Mapbox Outdoors', 'mapbox', 'outdoors-v11', mapbox_token),
        mapboxBackgroundStyle('mapbox_outdoors_globe', 'Mapbox Outdoors (globe)', 'mapbox', 'outdoors-v12', mapbox_token),
        mapboxBackgroundStyle('mapbox_light', 'Mapbox Light', 'mapbox', 'light-v10', mapbox_token),
        mapboxBackgroundStyle('mapbox_light_globe', 'Mapbox Light (globe)', 'mapbox', 'light-v11', mapbox_token),
        mapboxBackgroundStyle('mapbox_dark', 'Mapbox Dark', 'mapbox', 'dark-v10', mapbox_token),
        mapboxBackgroundStyle('mapbox_dark_globe', 'Mapbox Dark (globe)', 'mapbox', 'dark-v11', mapbox_token),
        mapboxBackgroundStyle('mapbox_satellite_streets', 'Mapbox Satellite', 'mapbox', 'satellite-streets-v11', mapbox_token),
        mapboxBackgroundStyle('mapbox_satellite_streets_globe', 'Mapbox Satellite (globe)', 'mapbox', 'satellite-streets-v12', mapbox_token),
    );
    requestTransformFunc = (url, resourceType) => isMapboxURL(url) ? transformMapboxUrl(url, resourceType as string, mapbox_token) : { url };
}

if (maptiler_key) {
    backgroundStyles.push(
        maptilerBackgroundStyle('maptiler_backdrop', 'Maptiler Backdrop', 'backdrop', maptiler_key),
        maptilerBackgroundStyle('maptiler_basic', 'Maptiler Basic', 'basic-v2', maptiler_key),
        maptilerBackgroundStyle('maptiler_bright', 'Maptiler Bright', 'bright-v2', maptiler_key),
        maptilerBackgroundStyle('maptiler_osm_carto', 'Maptiler OSM Carto', 'openstreetmap', maptiler_key),
        maptilerBackgroundStyle('maptiler_outdoors', 'Maptiler Outdoors', 'outdoor-v2', maptiler_key),
        maptilerBackgroundStyle('maptiler_satellite_hybrid', 'Maptiler Satellite', 'hybrid', maptiler_key),
        maptilerBackgroundStyle('maptiler_streets', 'Maptiler Streets', 'streets-v2', maptiler_key),
        maptilerBackgroundStyle('maptiler_toner', 'Maptiler Toner', 'toner-v2', maptiler_key),
        maptilerBackgroundStyle('maptiler_topo', 'Maptiler Topo', 'topo-v2', maptiler_key),
        maptilerBackgroundStyle('maptiler_winter', 'Maptiler Winter', "winter-v2", maptiler_key),
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

    /********** Start of Mapbox GL JS specific code **********/
    // mapLibrary.accessToken = mapbox_token;
    // debugLog("Using MapboxGeocoder", { mapbox_token });
    // const geocoderControl = new MapboxGeocoder({
    //     accessToken: mapbox_token,
    //     collapsed: true,
    //     language: document.documentElement.lang,
    //     mapboxgl: mapboxgl
    // });
    // setRTLTextPlugin(
    //     'https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js',
    //     err => err ? console.error("Error loading mapbox-gl-rtl-text", err) : debugLog("mapbox-gl-rtl-text loaded"),
    //     true // Lazy load the plugin
    // );
    /********** End of Mapbox GL JS specific code **********/

    /********** Start of Maplibre GL JS specific code **********/
    debugLog("Using Maptiler GeocoderControl", { maptiler_key });
    let geocoderControl: GeocodingControl | undefined;
    if (maptiler_key)
        geocoderControl = new GeocodingControl({ apiKey: maptiler_key });
    /********** End of Maplibre GL JS specific code **********/

    document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key == "f") {
            geocoderControl?.focus();
            e.preventDefault();
        }
    });

    new EtymologyMap('map', backgroundStyles, geocoderControl, requestTransformFunc);
}

/**
 * @see https://maplibre.org/maplibre-gl-js/docs/examples/check-for-support/
 */
function isWebglSupported() {
    if (window.WebGLRenderingContext) {
        const canvas = document.createElement('canvas');
        try {
            const context =
                canvas.getContext('webgl2') || canvas.getContext('webgl');
            if (context && typeof context.getParameter == 'function') {
                return true;
            }
        } catch (e) {
            // WebGL is supported, but disabled
        }
        return false;
    }
    // WebGL not supported
    return false;
}


/**
 * 
 * @see https://maplibre.org/maplibre-gl-js-docs/example/check-for-support/
 * @see https://docs.mapbox.com/mapbox-gl-js/example/check-for-support/
 */
function initPage() {
    if (isWebglSupported()) {
        document.getElementById("map")?.classList.remove("hiddenElement");
        initMap();
    } else {
        const errorMessage = document.createElement("strong");
        errorMessage.innerHTML = 'Your browser does not support Mapbox GL JS, which is needed to render the map. You can find out the minimum requirements <a href="https://docs.mapbox.com/help/troubleshooting/mapbox-browser-support/">here</a>.';
        document.body.appendChild(errorMessage);

        logErrorMessage("Device/Browser does not support Mapbox GL JS");
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
