// import { default as mapLibrary, RequestTransformFunction } from 'maplibre-gl';
// import { GeocodingControl } from "@maptiler/geocoding-control/maplibregl";
// import "@maptiler/geocoding-control/style.css";
// import { isMapboxURL, transformMapboxUrl } from 'maplibregl-mapbox-request-transformer';

import { default as mapLibrary, TransformRequestFunction as RequestTransformFunction } from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';

import { EtymologyMap } from './EtymologyMap';
import { logErrorMessage, initSentry, initGoogleAnalytics, initMatomo } from './monitoring';
import { BackgroundStyle, maptilerStyle, mapboxStyle, stadiaStyle, jawgStyle } from './controls/BackgroundStyleControl';
import { debugLog, getBoolConfig, getConfig } from './config';
import { setPageLocale } from './i18n';
import './style.css';

initSentry();
initGoogleAnalytics();
initMatomo();

setPageLocale();

let requestTransformFunc: RequestTransformFunction | undefined;
const maptiler_key = getConfig("maptiler_key"),
    enable_stadia_maps = getBoolConfig("enable_stadia_maps"),
    jawg_token = getConfig("jawg_token"),
    mapbox_token = getConfig("mapbox_token"),
    backgroundStyles: BackgroundStyle[] = [];

if (mapbox_token) {
    backgroundStyles.push(
        mapboxStyle('mapbox_streets', 'Mapbox Streets', 'mapbox', 'streets-v11', mapbox_token),
        mapboxStyle('mapbox_streets_globe', 'Mapbox Streets (globe)', 'mapbox', 'streets-v12', mapbox_token),
        mapboxStyle('mapbox_outdoors', 'Mapbox Outdoors', 'mapbox', 'outdoors-v11', mapbox_token),
        mapboxStyle('mapbox_outdoors_globe', 'Mapbox Outdoors (globe)', 'mapbox', 'outdoors-v12', mapbox_token),
        mapboxStyle('mapbox_light', 'Mapbox Light', 'mapbox', 'light-v10', mapbox_token),
        mapboxStyle('mapbox_light_globe', 'Mapbox Light (globe)', 'mapbox', 'light-v11', mapbox_token),
        mapboxStyle('mapbox_dark', 'Mapbox Dark', 'mapbox', 'dark-v10', mapbox_token),
        mapboxStyle('mapbox_dark_globe', 'Mapbox Dark (globe)', 'mapbox', 'dark-v11', mapbox_token),
        mapboxStyle('mapbox_satellite_streets', 'Mapbox Satellite', 'mapbox', 'satellite-streets-v11', mapbox_token),
        mapboxStyle('mapbox_satellite_streets_globe', 'Mapbox Satellite (globe)', 'mapbox', 'satellite-streets-v12', mapbox_token),
    );
    // requestTransformFunc = (url, resourceType) => isMapboxURL(url) ? transformMapboxUrl(url, resourceType as string, mapbox_token) : { url };
}

if (enable_stadia_maps) {
    backgroundStyles.push(
        stadiaStyle('stadia_alidade_dark', "Stadia Alidade smooth dark", 'alidade_smooth_dark'),
        stadiaStyle('stadia_alidade', "Stadia Alidade smooth", 'alidade_smooth'),
        stadiaStyle('stadia_satellite', "Stadia Alidade Satellite", 'alidade_satellite'),
        stadiaStyle('stadia_outdoors', "Stadia Outdoors", 'outdoors'),
        stadiaStyle('stadia_osm_bright', "Stadia OSM Bright", 'osm_bright'),
    );
}

if (jawg_token) {
    backgroundStyles.push(
        jawgStyle('jawg_streets', 'Jawg Streets', 'jawg-streets', jawg_token),
        jawgStyle('jawg_sunny', 'Jawg Sunny', 'jawg-sunny', jawg_token),
        jawgStyle('jawg_light', 'Jawg Light', 'jawg-light', jawg_token),
        jawgStyle('jawg_terrain', 'Jawg Terrain', 'jawg-terrain', jawg_token),
        jawgStyle('jawg_dark', 'Jawg Dark', 'jawg-dark', jawg_token),
    );
}

if (maptiler_key) {
    backgroundStyles.push(
        maptilerStyle('maptiler_backdrop', 'Maptiler Backdrop', 'backdrop', maptiler_key),
        maptilerStyle('maptiler_basic', 'Maptiler Basic', 'basic-v2', maptiler_key),
        maptilerStyle('maptiler_bright', 'Maptiler Bright', 'bright-v2', maptiler_key),
        maptilerStyle('maptiler_dataviz', 'Maptiler Dataviz', 'dataviz', maptiler_key),
        maptilerStyle('maptiler_ocean', 'Maptiler Ocean', 'ocean', maptiler_key),
        maptilerStyle('maptiler_osm_carto', 'Maptiler OSM Carto', 'openstreetmap', maptiler_key),
        maptilerStyle('maptiler_outdoors', 'Maptiler Outdoors', 'outdoor-v2', maptiler_key),
        maptilerStyle('maptiler_satellite_hybrid', 'Maptiler Satellite', 'hybrid', maptiler_key),
        maptilerStyle('maptiler_streets', 'Maptiler Streets', 'streets-v2', maptiler_key),
        maptilerStyle('maptiler_toner', 'Maptiler Toner', 'toner-v2', maptiler_key),
        maptilerStyle('maptiler_topo', 'Maptiler Topo', 'topo-v2', maptiler_key),
        maptilerStyle('maptiler_winter', 'Maptiler Winter', "winter-v2", maptiler_key),
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
    if (!mapbox_token)
        throw new Error("Missing Mapbox token");
    mapLibrary.accessToken = mapbox_token;
    debugLog("Using MapboxGeocoder", { mapbox_token });
    const geocoderControl = new MapboxGeocoder({
        accessToken: mapbox_token,
        collapsed: true,
        language: document.documentElement.lang,
        mapboxgl: mapLibrary
    });
    const focusOnGeocoder = () => geocoderControl.clear();
    /********** End of Mapbox GL JS specific code **********/

    /********** Start of Maplibre GL JS specific code **********/
    // debugLog("Using Maptiler GeocoderControl", { maptiler_key });
    // let geocoderControl: GeocodingControl | undefined;
    // if (maptiler_key)
    //     geocoderControl = new GeocodingControl({ apiKey: maptiler_key });
    // const focusOnGeocoder = () => geocoderControl?.clear();
    /********** End of Maplibre GL JS specific code **********/

    document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key == "f") {
            focusOnGeocoder();
            e.preventDefault();
        }
    });

    // https://maplibre.org/maplibre-gl-js-docs/example/mapbox-gl-rtl-text/
    mapLibrary.setRTLTextPlugin(
        'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js',
        err => err ? console.error("Error loading mapbox-gl-rtl-text", err) : debugLog("mapbox-gl-rtl-text loaded"),
        true // Lazy load the plugin
    );

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
