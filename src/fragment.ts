import { ColorSchemeID } from "./colorScheme.model";
import { debugLog, getConfig } from "./config";
import { SourceID } from "./source.model";

const default_center_lat_raw = getConfig("default_center_lat"),
    default_center_lon_raw = getConfig("default_center_lon"),
    default_zoom_raw = getConfig("default_zoom"),
    default_center_lat = default_center_lat_raw ? parseFloat(default_center_lat_raw) : 0,
    default_center_lon = default_center_lon_raw ? parseFloat(default_center_lon_raw) : 0,
    default_zoom = default_zoom_raw ? parseInt(default_zoom_raw) : 1,
    defaultColorScheme: ColorSchemeID = getConfig("default_color_scheme") as ColorSchemeID,
    defaultSource: SourceID = "all";

interface FragmentParams {
    lon: number | null;
    lat: number | null;
    zoom: number | null;
    colorScheme: string | null;
    source: string | null;
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
            source: (hashParams && hashParams[4]) ? hashParams[4] : null,
        } as FragmentParams;
    debugLog("getFragmentParams", { hashParams, out });
    return out;
}

/**
 * Update the URL fragment with the given parameters.
 * If a parameter is !== undefined it is updated in the fragment.
 * If it is === undefined it is left untouched.
 */
function setFragmentParams(lon?: number, lat?: number, zoom?: number, colorScheme?: ColorSchemeID, source?: SourceID): string {
    const currentParams = getCorrectFragmentParams(),
        p = currentParams;

    if (typeof lon == 'number') p.lon = parseFloat(lon.toFixed(3));
    if (typeof lat == 'number') p.lat = parseFloat(lat.toFixed(3));
    if (typeof zoom == 'number') p.zoom = parseFloat(zoom.toFixed(1));
    if (typeof colorScheme == 'string') p.colorScheme = colorScheme;
    if (typeof source == 'string') p.source = source;

    const fragment = `#${p.lon},${p.lat},${p.zoom},${p.colorScheme},${p.source}`;
    window.location.hash = fragment;
    debugLog("setFragmentParams", { currentParams, p, fragment, lon, lat, zoom, colorScheme, source });
    return fragment;
}

interface CorrectFragmentParams {
    lon: number;
    lat: number;
    zoom: number;
    colorScheme: ColorSchemeID;
    source: SourceID;
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

    if (!p.source || p.source === 'null' || p.source === 'undefined') {
        debugLog("getCorrectFragmentParams: using default color scheme", { p, defaultSource });
        p.source = defaultSource;
    }

    return p as CorrectFragmentParams;
}

export { CorrectFragmentParams, getFragmentParams, getCorrectFragmentParams, setFragmentParams };