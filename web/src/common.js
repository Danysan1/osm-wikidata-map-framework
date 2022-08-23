const default_center_lat = parseFloat(document.head.querySelector('meta[name="default_center_lat"]')?.content),
    default_center_lon = parseFloat(document.head.querySelector('meta[name="default_center_lon"]')?.content),
    default_zoom = parseInt(document.head.querySelector('meta[name="default_zoom"]')?.content),
    defaultColorScheme = document.head.querySelector('meta[name="defaultColorScheme"]')?.content;

console.info("common start", {
    default_center_lon,
    default_center_lat,
    default_zoom,
    defaultColorScheme,
});

/**
 * 
 * @param {string} message 
 * @param {string} level Log level (default "error")
 * @param {object} extra 
 */
function logErrorMessage(message, level = "error", extra = undefined) {
    console.error(message, extra);
    if (typeof Sentry != 'undefined') {
        if (extra instanceof Error)
            Sentry.captureException(extra, { level, extra: message });
        else
            Sentry.captureMessage(message, { level, extra });
    }
}

/**
 * @typedef {Object} FragmentParams
 * @property {number?} lon
 * @property {number?} lat
 * @property {number?} zoom
 * @property {string?} colorScheme
 */

/**
 * Gets the parameters passed through the fragment
 * 
 * @returns {FragmentParams} Parameters passed through the fragment
 */
function getFragmentParams() {
    const hashParams = window.location.hash ? window.location.hash.substring(1).split(",") : null,
        out = {
            lon: (hashParams && hashParams[0] && !isNaN(parseFloat(hashParams[0]))) ? parseFloat(hashParams[0]) : undefined,
            lat: (hashParams && hashParams[1] && !isNaN(parseFloat(hashParams[1]))) ? parseFloat(hashParams[1]) : undefined,
            zoom: (hashParams && hashParams[2] && !isNaN(parseFloat(hashParams[2]))) ? parseFloat(hashParams[2]) : undefined,
            colorScheme: (hashParams && hashParams[3]) ? hashParams[3] : undefined,
        };
    //console.info("getFragmentParams", hashParams, out);
    return out;
}

/**
 * If a parameter is !== undefined it is updated in the fragment.
 * If it is === is left untouched
 * 
 * @param {number?} lon
 * @param {number?} lat
 * @param {number?} zoom
 * @param {string?} colorScheme
 * @returns {string} The fragment actually set
 */
function setFragmentParams(lon, lat, zoom, colorScheme) {
    const currentParams = getFragmentParams()
    let p = currentParams;

    if (typeof lon == 'number') p.lon = lon.toFixed(3);
    if (typeof lat == 'number') p.lat = lat.toFixed(3);
    if (typeof zoom == 'number') p.zoom = zoom.toFixed(1);
    if (typeof colorScheme == 'string') p.colorScheme = colorScheme;

    const fragment = "#" + p.lon + "," + p.lat + "," + p.zoom + "," + p.colorScheme;
    window.location.hash = fragment;
    console.info("setFragmentParams", { currentParams, p, fragment, lon, lat, zoom, colorScheme });
    return fragment;
}

/**
 * @typedef {Object} CorrectFragmentParams
 * @property {number} lon
 * @property {number} lat
 * @property {number} zoom
 * @property {string} colorScheme
 */

/**
 * 
 * @returns {CorrectFragmentParams}
 */
function getCorrectFragmentParams() {
    let p = getFragmentParams();
    if (p.lat < -90 || p.lat > 90) {
        console.error("Invalid latitude", p.lat);
        p.lat = undefined;
    }

    if (p.lon === undefined || p.lat === undefined || p.zoom === undefined) {
        console.info("getCorrectFragmentParams: using default position", { p, default_center_lon, default_center_lat, default_zoom });
        p.lon = default_center_lon;
        p.lat = default_center_lat;
        p.zoom = default_zoom;
    }

    if (p.colorScheme === undefined) {
        console.info("getCorrectFragmentParams: using default color scheme", { p, defaultColorScheme });
        p.colorScheme = defaultColorScheme;
    }

    return p;
}

export { logErrorMessage, getFragmentParams, getCorrectFragmentParams, setFragmentParams, defaultColorScheme };