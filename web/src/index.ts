/* import maplibregl, { supported, setRTLTextPlugin, IControl } from 'maplibre-gl';
import { MaptilerGeocoderControl } from './MaptilerGeocoderControl';
import 'maplibre-gl/dist/maplibre-gl.css'; */

import mapboxgl, { supported, setRTLTextPlugin, IControl } from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import 'mapbox-gl/dist/mapbox-gl.css';

import { EtymologyMap } from './EtymologyMap';
import { logErrorMessage, initSentry, initGoogleAnalytics, initMatomo } from './monitoring';
import { getCorrectFragmentParams } from './fragment';
import { BackgroundStyle, maptilerBackgroundStyle, mapboxBackgroundStyle } from './BackgroundStyleControl';
import { getConfig } from './config';
import './style.css';

initSentry();
initGoogleAnalytics();
initMatomo();

const maptiler_key = getConfig("maptiler-key"),
    mapbox_token = getConfig("mapbox-token"),
    backgroundStyles: BackgroundStyle[] = [];

if (mapbox_token) {
    backgroundStyles.push(
        mapboxBackgroundStyle('mapbox_streets', 'Streets (Mapbox)', 'mapbox', 'streets-v11', mapbox_token),
        mapboxBackgroundStyle('mapbox_dark', 'Dark', 'mapbox', 'dark-v10', mapbox_token)
    );
}

if (maptiler_key) {
    backgroundStyles.push(
        maptilerBackgroundStyle('maptiler_streets', 'Streets (Maptiler)', 'streets', maptiler_key),
        maptilerBackgroundStyle('maptiler_bright', 'Bright', 'bright', maptiler_key),
        maptilerBackgroundStyle('maptiler_hybrid', 'Satellite', 'hybrid', maptiler_key),
        maptilerBackgroundStyle('maptiler_outdoors', 'Outdoors', 'outdoor', maptiler_key),
        maptilerBackgroundStyle('maptiler_osm_carto', 'OSM Carto', 'openstreetmap', maptiler_key)
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
    const startParams = getCorrectFragmentParams();
    console.info("Initializing the map", startParams);

    if (typeof mapboxgl == 'object' && typeof mapbox_token == 'string') {
        mapboxgl.accessToken = mapbox_token;
    }

    // https://maplibre.org/maplibre-gl-js-docs/example/mapbox-gl-rtl-text/
    setRTLTextPlugin(
        './node_modules/@mapbox/mapbox-gl-rtl-text/mapbox-gl-rtl-text.min.js',
        err => err ? console.error("Error loading mapbox-gl-rtl-text", err) : console.info("mapbox-gl-rtl-text loaded"),
        true // Lazy load the plugin
    );

    let geocoderControl: IControl|null;
    if (typeof mapboxgl == 'object' && typeof MapboxGeocoder == 'function' && typeof mapbox_token == 'string') {
        console.info("Using MapboxGeocoder", { mapboxgl, MapboxGeocoder, mapbox_token });
        geocoderControl = new MapboxGeocoder({
            accessToken: mapbox_token,
            collapsed: true,
            mapboxgl: mapboxgl
        });
    } /*else if (typeof maplibregl == 'object' && typeof MaptilerGeocoderControl == 'function' && typeof maptiler_key == 'string') {
        console.info("Using MaptilerGeocoderControl", { maplibregl, MaptilerGeocoderControl, maptiler_key });
        geocoderControl = new MaptilerGeocoderControl(maptiler_key);
    }*/ else {
        geocoderControl = null;
        console.warn("No geocoding plugin available");
    }

    new EtymologyMap('map', backgroundStyles, startParams, geocoderControl);
}


/**
 * 
 * @see https://maplibre.org/maplibre-gl-js-docs/example/check-for-support/
 * @see https://docs.mapbox.com/mapbox-gl-js/example/check-for-support/
 */
function initPage(e: Event) {
    if (!supported()) {
        logErrorMessage("Device/Browser does not support Maplibre/Mapbox GL JS");
        alert('Your browser is not supported');
    } else {
        initMap();
    }
}
