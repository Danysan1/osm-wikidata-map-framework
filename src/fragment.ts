import { ColorSchemeID } from "./model/colorScheme";
import { getConfig } from "./config";

const default_center_lat_raw = getConfig("default_center_lat"),
    default_center_lon_raw = getConfig("default_center_lon"),
    default_zoom_raw = getConfig("default_zoom"),
    default_center_lat = default_center_lat_raw ? parseFloat(default_center_lat_raw) : 0,
    default_center_lon = default_center_lon_raw ? parseFloat(default_center_lon_raw) : 0,
    default_zoom = default_zoom_raw ? parseInt(default_zoom_raw) : 1,
    defaultColorSchemeRaw = getConfig("default_color_scheme"),
    defaultColorScheme = defaultColorSchemeRaw && defaultColorSchemeRaw in ColorSchemeID ? defaultColorSchemeRaw as ColorSchemeID : ColorSchemeID.blue,
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    defaultBackgroundStyleID = new URLSearchParams(window.location.search).get("style") || getConfig("default_background_style") || "stadia_alidade",
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    defaultBackEndID = getConfig("default_source") || "overpass_all";

interface FragmentParams {
    lon: number | null;
    lat: number | null;
    zoom: number | null;
    colorScheme: string | null;
    backEndID: string | null;
    backgroundStyleID: string | null;
}

/**
 * Gets the parameters passed through the fragment
 */
function getFragmentParams(): FragmentParams {
    const hashParams = window.location.hash ? window.location.hash.substring(1).split(",") : null,
        out: FragmentParams = {
            lon: (hashParams?.[0] && !isNaN(parseFloat(hashParams[0]))) ? parseFloat(hashParams[0]) : null,
            lat: (hashParams?.[1] && !isNaN(parseFloat(hashParams[1]))) ? parseFloat(hashParams[1]) : null,
            zoom: (hashParams?.[2] && !isNaN(parseFloat(hashParams[2]))) ? parseFloat(hashParams[2]) : null,
            colorScheme: hashParams?.[3] ?? null,
            backEndID: hashParams?.[4] ?? null,
            backgroundStyleID: hashParams?.[5] ?? null,
        };
    // if (process.env.NODE_ENV === 'development') console.debug("getFragmentParams", { hashParams, out });
    return out;
}

/**
 * Update the URL fragment with the given parameters.
 * If a parameter is !== undefined it is updated in the fragment.
 * If it is === undefined it is left untouched.
 */
function setFragmentParams(
    lon?: number, lat?: number, zoom?: number, colorScheme?: ColorSchemeID, backEndID?: string, backgroundStyleID?: string
): string {
    const current = getCorrectFragmentParams(),
        strLon = lon !== undefined ? lon.toFixed(4) : current.lon,
        strLat = lat !== undefined ? lat.toFixed(4) : current.lat,
        strZoom = zoom !== undefined ? zoom.toFixed(1) : current.zoom,
        strColorScheme = colorScheme ?? current.colorScheme,
        strBackEnd = backEndID ?? current.backEndID,
        strBackground = backgroundStyleID ?? current.backgroundStyleID;

    const fragment = `#${strLon},${strLat},${strZoom},${strColorScheme},${strBackEnd},${strBackground}`;
    if (window.location.hash !== fragment) {
        if (process.env.NODE_ENV === 'development') console.debug("setFragmentParams", { current, fragment, lon, lat, zoom, colorScheme, backEndID });
        window.location.hash = fragment;
    } else {
        if (process.env.NODE_ENV === 'development') console.debug("setFragmentParams: no change", { current, fragment, lon, lat, zoom, colorScheme, backEndID });
    }
    return fragment;
}

interface CorrectFragmentParams {
    lon: number;
    lat: number;
    zoom: number;
    colorScheme: ColorSchemeID;
    backEndID: string;
    backgroundStyleID: string;
}

function getCorrectFragmentParams(): CorrectFragmentParams {
    const raw = getFragmentParams(),
        correct: CorrectFragmentParams = {
            lon: raw.lon ?? default_center_lon,
            lat: raw.lat !== null && raw.lat >= -90 && raw.lat <= 90 ? raw.lat : default_center_lat,
            zoom: raw.zoom ? raw.zoom : default_zoom,
            colorScheme: raw.colorScheme && raw.colorScheme in ColorSchemeID ? raw.colorScheme as ColorSchemeID : defaultColorScheme,
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            backEndID: raw.backEndID?.replace("db_", "pmtiles_") || defaultBackEndID,
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            backgroundStyleID: raw.backgroundStyleID || defaultBackgroundStyleID,
        };
    //if (process.env.NODE_ENV === 'development') console.debug("getCorrectFragmentParams", { raw, correct });
    return correct;
}

export { CorrectFragmentParams, getFragmentParams, getCorrectFragmentParams, setFragmentParams };