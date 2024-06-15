'use client';

import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useState } from "react";
import { parseStringArrayConfig } from "../config";
import { DEFAULT_SOURCE_PRESET_ID } from "../model/SourcePreset";
import { ColorSchemeID } from "../model/colorScheme";

const DEFAULT_LAT = 0,
    DEFAULT_LON = 0,
    DEFAULT_ZOOM = 1,
    DEFAULT_COLOR_SCHEME = ColorSchemeID.blue,
    DEFAULT_BACKEND_ID = "overpass_all",
    DEFAULT_BACKGROUND_STYLE_ID = "stadia_alidade";

interface UrlFragmentState {
    lon: number;
    setLon: (lon: number) => void;
    lat: number;
    setLat: (lat: number) => void;
    zoom: number;
    setZoom: (zoom: number) => void;
    colorScheme: ColorSchemeID;
    setColorScheme: (colorScheme: ColorSchemeID) => void;
    backEndID: string;
    setBackEndID: (backEndID: string) => void;
    backgroundStyleID: string;
    setBackgroundStyleID: (backgroundStyleID: string) => void;
    sourcePresetID: string;
    setSourcePresetID: (sourcePresetID: string) => void;
}

const UrlFragmentContext = createContext<UrlFragmentState>({
    lon: DEFAULT_LAT,
    setLon: () => {/* placeholder */},
    lat: DEFAULT_LON,
    setLat: () => {/* placeholder */},
    zoom: DEFAULT_ZOOM,
    setZoom: () => {/* placeholder */},
    colorScheme: DEFAULT_COLOR_SCHEME,
    setColorScheme: () => {/* placeholder */},
    backEndID: DEFAULT_BACKEND_ID,
    setBackEndID: () => {/* placeholder */},
    backgroundStyleID: DEFAULT_BACKGROUND_STYLE_ID,
    setBackgroundStyleID: () => {/* placeholder */},
    sourcePresetID: DEFAULT_SOURCE_PRESET_ID,
    setSourcePresetID: () => {/* placeholder */}
});

export const useUrlFragmentContext = () => useContext(UrlFragmentContext);

export const UrlFragmentContextProvider = (props: PropsWithChildren) => {
    const [lon, setLon] = useState<number>(() => process.env.owmf_default_center_lat ? parseFloat(process.env.owmf_default_center_lat) : DEFAULT_LAT),
        [lat, _setLat] = useState<number>(() => process.env.owmf_default_center_lon ? parseFloat(process.env.owmf_default_center_lon) : DEFAULT_LON),
        [zoom, _setZoom] = useState<number>(() => process.env.owmf_default_zoom ? parseInt(process.env.owmf_default_zoom) : DEFAULT_ZOOM),
        [colorScheme, setColorScheme] = useState<ColorSchemeID>(() => { const raw = process.env.owmf_default_color_scheme; return raw && raw in ColorSchemeID ? raw as ColorSchemeID : DEFAULT_COLOR_SCHEME; }),
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        [backEndID, setBackEndID] = useState<string>(() => process.env.owmf_default_backend || DEFAULT_BACKEND_ID),
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        [backgroundStyleID, setBackgroundStyleID] = useState<string>(() => new URLSearchParams(window.location.search).get("style") || process.env.owmf_default_background_style || DEFAULT_BACKGROUND_STYLE_ID),
        [sourcePresetID, setSourcePresetID] = useState<string>(() => {
            const list = process.env.owmf_source_presets ? parseStringArrayConfig(process.env.owmf_source_presets) : undefined;
            return list?.length ? list[0] : DEFAULT_SOURCE_PRESET_ID;
        }),
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

    return <UrlFragmentContext.Provider value={{ lon, setLon, lat, setLat, zoom, setZoom, colorScheme, setColorScheme, backEndID, setBackEndID, backgroundStyleID, setBackgroundStyleID, sourcePresetID, setSourcePresetID }}>
        {props.children}
    </UrlFragmentContext.Provider>;
}
