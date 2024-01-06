import { ColorSchemeID } from "./model/colorScheme";
import { debug, getConfig } from "./config";

const default_center_lat_raw = getConfig("default_center_lat"),
    default_center_lon_raw = getConfig("default_center_lon"),
    default_zoom_raw = getConfig("default_zoom"),
    default_center_lat = default_center_lat_raw ? parseFloat(default_center_lat_raw) : 0,
    default_center_lon = default_center_lon_raw ? parseFloat(default_center_lon_raw) : 0,
    default_zoom = default_zoom_raw ? parseInt(default_zoom_raw) : 1,
    defaultColorSchemeRaw = getConfig("default_color_scheme"),
    defaultColorScheme = defaultColorSchemeRaw && defaultColorSchemeRaw in ColorSchemeID ? defaultColorSchemeRaw as ColorSchemeID : ColorSchemeID.blue,
    defaultBackEndID = getConfig("default_source") || "overpass_all";

interface FragmentParams {
    lon: number | null;
    lat: number | null;
    zoom: number | null;
    colorScheme: string | null;
    backEndID: string | null;
}

/**
 * Gets the parameters passed through the fragment
 */
function getFragmentParams(): FragmentParams {
    const hashParams = window.location.hash ? window.location.hash.substring(1).split(",") : null,
        out: FragmentParams = {
            lon: (hashParams && hashParams[0] && !isNaN(parseFloat(hashParams[0]))) ? parseFloat(hashParams[0]) : null,
            lat: (hashParams && hashParams[1] && !isNaN(parseFloat(hashParams[1]))) ? parseFloat(hashParams[1]) : null,
            zoom: (hashParams && hashParams[2] && !isNaN(parseFloat(hashParams[2]))) ? parseFloat(hashParams[2]) : null,
            colorScheme: (hashParams && hashParams[3]) ? hashParams[3] : null,
            backEndID: (hashParams && hashParams[4]) ? hashParams[4] : null,
        };
    //if(enable_debug_log) console.info("getFragmentParams", { hashParams, out });
    return out;
}

/**
 * Update the URL fragment with the given parameters.
 * If a parameter is !== undefined it is updated in the fragment.
 * If it is === undefined it is left untouched.
 */
function setFragmentParams(lon?: number, lat?: number, zoom?: number, colorScheme?: ColorSchemeID, backEndID?: string): string {
    const currentParams = getCorrectFragmentParams(),
        pos = { ...currentParams };

    if (typeof lon === 'number') pos.lon = parseFloat(lon.toFixed(4));
    if (typeof lat === 'number') pos.lat = parseFloat(lat.toFixed(4));
    if (typeof zoom === 'number') pos.zoom = parseFloat(zoom.toFixed(1));
    if (typeof colorScheme === 'string') pos.colorScheme = colorScheme;
    if (typeof backEndID === 'string') pos.backEndID = backEndID;

    const fragment = `#${pos.lon},${pos.lat},${pos.zoom},${pos.colorScheme},${pos.backEndID}`;
    if (window.location.hash !== fragment) {
        if (debug) console.info("setFragmentParams", { currentParams, pos, fragment, lon, lat, zoom, colorScheme, source: backEndID });
        window.location.hash = fragment;
    } else {
        if (debug) console.info("setFragmentParams: no change", { currentParams, pos, fragment, lon, lat, zoom, colorScheme, source: backEndID });
    }
    return fragment;
}

interface CorrectFragmentParams {
    lon: number;
    lat: number;
    zoom: number;
    colorScheme: ColorSchemeID;
    backEndID: string;
}

function getCorrectFragmentParams(): CorrectFragmentParams {
    const raw = getFragmentParams(),
        correct: CorrectFragmentParams = {
            lon: raw.lon !== null ? raw.lon : default_center_lon,
            lat: raw.lat !== null && raw.lat >= -90 && raw.lat <= 90 ? raw.lat : default_center_lat,
            zoom: raw.zoom ? raw.zoom : default_zoom,
            colorScheme: raw.colorScheme && raw.colorScheme in ColorSchemeID ? raw.colorScheme as ColorSchemeID : defaultColorScheme,
            backEndID: raw.backEndID?.replace("db_", "vector_") || defaultBackEndID,
        };
    //if (debug) console.info("getCorrectFragmentParams", { raw, correct });
    return correct;
}

export { CorrectFragmentParams, getFragmentParams, getCorrectFragmentParams, setFragmentParams };