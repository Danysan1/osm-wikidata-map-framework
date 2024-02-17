import type { RequestTransformFunction } from 'maplibre-gl';
import { isMapboxURL, transformMapboxUrl } from 'maplibregl-mapbox-request-transformer';
import { logErrorMessage, initSentry, initGoogleAnalytics, initMatomo } from './monitoring';
import { BackgroundStyle, maptilerStyle, mapboxStyle, stadiaStyle, jawgStyle } from './model/backgroundStyle';
import { getBoolConfig, getConfig } from './config';
import { setPageLocale } from './i18n';
import './style.css';

initSentry();
initGoogleAnalytics();
initMatomo();

setPageLocale();

const maptiler_key = getConfig("maptiler_key"),
    enable_stadia_maps = getBoolConfig("enable_stadia_maps"),
    jawg_token = getConfig("jawg_token"),
    mapbox_token = getConfig("mapbox_token"),
    backgroundStyles: BackgroundStyle[] = [];

if (mapbox_token) {
    backgroundStyles.push(
        mapboxStyle('mapbox_streets', 'Streets', 'mapbox', 'streets-v12', mapbox_token),
        mapboxStyle('mapbox_outdoors', 'Outdoors', 'mapbox', 'outdoors-v12', mapbox_token),
        mapboxStyle('mapbox_light', 'Light', 'mapbox', 'light-v11', mapbox_token),
        mapboxStyle('mapbox_dark', 'Dark', 'mapbox', 'dark-v11', mapbox_token),
        mapboxStyle('mapbox_satellite', 'Satellite', 'mapbox', 'satellite-streets-v12', mapbox_token),
    );
}

if (enable_stadia_maps) {
    backgroundStyles.push(
        stadiaStyle('stadia_alidade_dark', "Alidade smooth dark", 'alidade_smooth_dark'),
        stadiaStyle('stadia_alidade', "Alidade smooth", 'alidade_smooth'),
        //stadiaStyle('stadia_satellite', "Alidade Satellite", 'alidade_satellite'),
        stadiaStyle('stadia_outdoors', "Outdoors", 'outdoors'),
        stadiaStyle('stadia_osm_bright', "OSM Bright", 'osm_bright'),
        stadiaStyle('stamen_terrain', "Stamen Terrain", 'stamen_terrain'),
        stadiaStyle('stamen_toner', "Stamen Toner", 'stamen_toner'),
        stadiaStyle('stamen_toner_lite', "Stamen Toner Lite", 'stamen_toner_lite'),
        stadiaStyle('stamen_watercolor', "Stamen Watercolor", 'stamen_watercolor'),
    );
}

if (jawg_token) {
    backgroundStyles.push(
        jawgStyle('jawg_streets', 'Streets', 'jawg-streets', jawg_token),
        jawgStyle('jawg_streets_3d', 'Streets 3D', 'jawg-streets', jawg_token, true),
        jawgStyle('jawg_sunny', 'Sunny', 'jawg-sunny', jawg_token),
        jawgStyle('jawg_light', 'Light', 'jawg-light', jawg_token),
        jawgStyle('jawg_terrain', 'Terrain', 'jawg-terrain', jawg_token),
        jawgStyle('jawg_dark', 'Dark', 'jawg-dark', jawg_token),
    );
}

backgroundStyles.push({
    id: "americana", vendorText: "OpenStreetMap US", styleText: "OSM Americana", styleUrl: "https://zelonewolf.github.io/openstreetmap-americana/style.json", keyPlaceholder: 'https://tile.ourmap.us/data/v3.json', key: 'https://tiles.stadiamaps.com/data/openmaptiles.json'
});

if (maptiler_key) {
    backgroundStyles.push(
        { id: "liberty", vendorText: "Maputnik", styleText: "OSM Liberty", styleUrl: "https://maputnik.github.io/osm-liberty/style.json", keyPlaceholder: '{key}', key: maptiler_key },
        maptilerStyle('maptiler_backdrop', 'Backdrop', 'backdrop', maptiler_key),
        maptilerStyle('maptiler_basic', 'Basic', 'basic-v2', maptiler_key),
        maptilerStyle('maptiler_bright', 'Bright', 'bright-v2', maptiler_key),
        maptilerStyle('maptiler_dataviz', 'Dataviz', 'dataviz', maptiler_key),
        maptilerStyle('maptiler_dark', 'Dark', 'dataviz-dark', maptiler_key),
        maptilerStyle('maptiler_ocean', 'Ocean', 'ocean', maptiler_key),
        maptilerStyle('maptiler_osm_carto', 'OSM Carto', 'openstreetmap', maptiler_key),
        maptilerStyle('maptiler_outdoors', 'Outdoors', 'outdoor-v2', maptiler_key),
        maptilerStyle('maptiler_satellite_hybrid', 'Satellite', 'hybrid', maptiler_key),
        maptilerStyle('maptiler_streets', 'Streets', 'streets-v2', maptiler_key),
        maptilerStyle('maptiler_toner', 'Toner', 'toner-v2', maptiler_key),
        maptilerStyle('maptiler_topo', 'Topo', 'topo-v2', maptiler_key),
        maptilerStyle('maptiler_winter', 'Winter', "winter-v2", maptiler_key),
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
    if (process.env.NODE_ENV === 'development') console.debug("Initializing the map");
    let requestTransformFunc: RequestTransformFunction | undefined;

    /********** Start of Mapbox GL JS specific code **********/
    // if (!mapbox_token)
    //     throw new Error("Missing Mapbox token");
    // mapLibrary.accessToken = mapbox_token;
    /********** End of Mapbox GL JS specific code **********/

    /********** Start of Maplibre GL JS specific code **********/
    if (mapbox_token) {
        requestTransformFunc = (url, resourceType) => {
            if (isMapboxURL(url))
                return transformMapboxUrl(url, resourceType as string, mapbox_token);
            if (/^http:\/\/[^/]+(?<!localhost)\/(elements|etymology_map)\//.test(url))
                return { url: url.replace("http", "https") };
            return { url };
        };
    }
    /********** End of Maplibre GL JS specific code **********/

    void import("./EtymologyMap").then(
        ({ EtymologyMap }) => new EtymologyMap('map', backgroundStyles, requestTransformFunc)
    );
}

/**
 * @see https://maplibre.org/maplibre-gl-js/docs/examples/check-for-support/
 */
function isWebglSupported() {
    if (!window.WebGLRenderingContext) // WebGL not supported
        return false;

    const canvas = document.createElement('canvas');
    try {
        const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
        if (context && typeof context.getParameter == 'function') {
            return true;
        }
    } catch (e) {
        // WebGL is supported, but disabled
    }

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
        //errorMessage.innerHTML = 'Your browser does not support Mapbox GL JS, which is needed to render the map. You can find out the minimum requirements <a href="https://docs.mapbox.com/help/troubleshooting/mapbox-browser-support/">here</a>.';
        errorMessage.innerHTML = 'Your browser does not support Maplibre GL JS, which is needed to render the map.';
        document.body.appendChild(errorMessage);

        logErrorMessage("Device/Browser does not support the map library.");
    }
}
