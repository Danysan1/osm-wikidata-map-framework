import { debugLog, getConfig } from "./config";

const default_center_lat_raw = getConfig("default_center_lat"),
    default_center_lon_raw = getConfig("default_center_lon"),
    default_zoom_raw = getConfig("default_zoom"),
    default_center_lat = default_center_lat_raw ? parseFloat(default_center_lat_raw) : 0,
    default_center_lon = default_center_lon_raw ? parseFloat(default_center_lon_raw) : 0,
    default_zoom = default_zoom_raw ? parseInt(default_zoom_raw) : 1,
    defaultColorScheme = getConfig("default_color_scheme");

interface FragmentParams {
    lon: number | null;
    lat: number | null;
    zoom: number | null;
    colorScheme: string | null;
}

/**
 * Gets the parameters passed through the fragment
 */
function getFragmentParams(): FragmentParams {
    const hashParams = window.location.hash ? window.location.hash.substring(1).split(",") : null,
        out = {
            lon: (hashParams && hashParams[0] && !isNaN(parseFloat(hashParams[0]))) ? parseFloat(hashParams[0]) : null,
            lat: (hashParams && hashParams[1] && !isNaN(parseFloat(hashParams[1]))) ? parseFloat(hashParams[1]) : null,
            zoom: (hashParams && hashParams[2] && !isNaN(parseFloat(hashParams[2]))) ? parseFloat(hashParams[2]) : null,
            colorScheme: (hashParams && hashParams[3]) ? hashParams[3] : null,
        } as FragmentParams;
    debugLog("getFragmentParams", { hashParams, out });
    return out;
}

/**
 * Update the URL fragment with the given parameters.
 * If a parameter is !== undefined it is updated in the fragment.
 * If it is === undefined it is left untouched.
 */
function setFragmentParams(lon: number | undefined, lat: number | undefined, zoom: number | undefined, colorScheme: string | undefined): string {
    const currentParams = getFragmentParams(),
        p = currentParams;

    if (typeof lon == 'number') p.lon = parseFloat(lon.toFixed(3));
    if (typeof lat == 'number') p.lat = parseFloat(lat.toFixed(3));
    if (typeof zoom == 'number') p.zoom = parseFloat(zoom.toFixed(1));
    if (typeof colorScheme == 'string') p.colorScheme = colorScheme;

    const fragment = "#" + p.lon + "," + p.lat + "," + p.zoom + "," + p.colorScheme;
    window.location.hash = fragment;
    debugLog("setFragmentParams", { currentParams, p, fragment, lon, lat, zoom, colorScheme });
    return fragment;
}

interface CorrectFragmentParams {
    lon: number;
    lat: number;
    zoom: number;
    colorScheme: string;
}

function getCorrectFragmentParams(): CorrectFragmentParams {
    const p = getFragmentParams();
    if ((p.lat !== null && p.lat < -90) || (p.lat !== null && p.lat > 90)) {
        console.error("Invalid latitude", p.lat);
        p.lat = null;
    }

    if (p.lon === null || p.lat === null || p.zoom === null) {
        debugLog("getCorrectFragmentParams: using default position", { p, default_center_lon, default_center_lat, default_zoom });
        p.lon = default_center_lon;
        p.lat = default_center_lat;
        p.zoom = default_zoom;
    }

    if (!p.colorScheme || p.colorScheme === 'null' || p.colorScheme === 'undefined') {
        debugLog("getCorrectFragmentParams: using default color scheme", { p, defaultColorScheme });
        p.colorScheme = defaultColorScheme;
    }

    return p as CorrectFragmentParams;
}

export { CorrectFragmentParams, getFragmentParams, getCorrectFragmentParams, setFragmentParams };