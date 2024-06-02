import { ColorSchemeID } from "./model/colorScheme";
import { getConfig, getFloatConfig, getIntConfig, getStringArrayConfig } from "./config";
import { DEFAULT_SOURCE_PRESET_ID } from "./model/SourcePreset";
import { useCallback, useEffect, useState } from "react";

export function useUrlFragment() {
    const [lon, setLon] = useState<number>(() => getFloatConfig("default_center_lat") ?? 0),
        [lat, _setLat] = useState<number>(() => getFloatConfig("default_center_lon") ?? 0),
        [zoom, _setZoom] = useState<number>(() => getIntConfig("default_zoom") ?? 1),
        [colorScheme, setColorScheme] = useState<ColorSchemeID>(() => { const raw = getConfig("default_color_scheme"); return raw && raw in ColorSchemeID ? raw as ColorSchemeID : ColorSchemeID.blue; }),
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        [backEndID, setBackEndID] = useState<string>(() => getConfig("default_backend") || "overpass_all"),
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        [backgroundStyleID, setBackgroundStyleID] = useState<string>(() => new URLSearchParams(window.location.search).get("style") || getConfig("default_background_style") || "stadia_alidade"),
        [sourcePresetID, setSourcePresetID] = useState<string>(() => { const list = getStringArrayConfig("source_presets"); return list?.length ? list[0] : DEFAULT_SOURCE_PRESET_ID; }),
        setLat = useCallback((lat: number) => {
            if (isNaN(lat) || lat < -90 || lat > 90)
                throw new Error(`Invalid latitude: ${lat}`);
            else
                _setLat(lat);
        }, [_setLat]),
        setZoom = useCallback((zoom: number) => {
            if (isNaN(zoom) || zoom < 0 || zoom > 20)
                throw new Error(`Invalid zoom: ${zoom}`);
            else
                _setZoom(zoom);
        }, [_setZoom]);

    /** Update the URL fragment on state change */
    useEffect(() => {
        const strLon = lon.toFixed(4),
            strLat = lat.toFixed(4),
            strZoom = zoom.toFixed(1);

        const fragment = `#${strLon},${strLat},${strZoom},${colorScheme},${backEndID},${backgroundStyleID},${sourcePresetID}`;
        if (window.location.hash !== fragment) {
            if (process.env.NODE_ENV === 'development') console.debug("setFragmentParams: CHANGE DETECTED", { old: window.location.hash, new: fragment, lon, lat, zoom, colorScheme, backEndID, backgroundStyleID, templateID: sourcePresetID });
            window.location.hash = fragment;
        } else {
            if (process.env.NODE_ENV === 'development') console.debug("setFragmentParams: no change", { fragment, lon, lat, zoom, colorScheme, backEndID, backgroundStyleID, templateID: sourcePresetID });
        }

    }, [lon, lat, zoom, colorScheme, backEndID, backgroundStyleID, sourcePresetID]);

    return { lon, setLon, lat, setLat, zoom, setZoom, colorScheme, setColorScheme, backEndID, setBackEndID, backgroundStyleID, setBackgroundStyleID, sourcePresetID, setSourcePresetID };
}

/**
 * @deprecated Use useUrlFragment instead
 */
export function getLon(): number | null {
    const raw = window.location.search.split(',')[0];
    if (!raw) return null;
    return parseFloat(raw);
}

/**
 * @deprecated Use useUrlFragment instead
 */
export function getLat(): number | null {
    const raw = window.location.search.split(',')[1];
    if (!raw) return null;
    return parseFloat(raw);
}

/**
 * @deprecated Use useUrlFragment instead
 */
export function getZoom(): number | null {
    const raw = window.location.search.split(',')[2];
    if (!raw) return null;
    return parseFloat(raw)
}

/**
 * @deprecated Use useUrlFragment instead
 */
export function getColorSchemeID(): ColorSchemeID | null {
    const raw = window.location.search.split(',')[3];
    if (!raw || !(raw in ColorSchemeID)) return null;
    return raw as ColorSchemeID;
}

/**
 * @deprecated Use useUrlFragment instead
 */
export function getBackEndID(): string | null {
    return window.location.search.split(',')[4] ?? null;
}

/**
 * @deprecated Use useUrlFragment instead
 */
export function getBackgroundStyleID(): string | null {
    return window.location.search.split(',')[5] ?? null;
}

/**
 * @deprecated Use useUrlFragment instead
 */
export function getSourcePresetID(): string | null {
    return window.location.search.split(',')[6] ?? null;
}