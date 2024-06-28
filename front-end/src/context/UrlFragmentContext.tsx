'use client';

import { Dispatch, FC, PropsWithChildren, SetStateAction, createContext, useCallback, useContext, useEffect, useState } from "react";
import { parseStringArrayConfig } from "../config";
import { DEFAULT_SOURCE_PRESET_ID } from "../model/SourcePreset";
import { ColorSchemeID } from "../model/colorScheme";

const LATITUDE_POSITION = 0,
    LONGITUDE_POSITION = 1,
    ZOOM_POSITION = 2,
    COLOR_SCHEME_POSITION = 3,
    BACK_END_POSITION = 4,
    BACKGROUND_STYLE_POSITION = 5,
    PRESET_POSITION = 6,
    DEFAULT_LATITUDE = 0,
    DEFAULT_LONGITUDE = 0,
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
    setZoom: Dispatch<SetStateAction<number>>;
    colorSchemeID: ColorSchemeID;
    setColorSchemeID: (colorScheme: ColorSchemeID) => void;
    backEndID: string;
    setBackEndID: (backEndID: string) => void;
    backgroundStyleID: string;
    setBackgroundStyleID: (backgroundStyleID: string) => void;
    sourcePresetID: string;
    setSourcePresetID: (sourcePresetID: string) => void;
}

const UrlFragmentContext = createContext<UrlFragmentState>({
    lon: DEFAULT_LATITUDE,
    setLon: () => {/* placeholder */ },
    lat: DEFAULT_LONGITUDE,
    setLat: () => {/* placeholder */ },
    zoom: DEFAULT_ZOOM,
    setZoom: () => {/* placeholder */ },
    colorSchemeID: DEFAULT_COLOR_SCHEME,
    setColorSchemeID: () => {/* placeholder */ },
    backEndID: DEFAULT_BACKEND_ID,
    setBackEndID: () => {/* placeholder */ },
    backgroundStyleID: DEFAULT_BACKGROUND_STYLE_ID,
    setBackgroundStyleID: () => {/* placeholder */ },
    sourcePresetID: DEFAULT_SOURCE_PRESET_ID,
    setSourcePresetID: () => {/* placeholder */ }
});

export const useUrlFragmentContext = () => useContext(UrlFragmentContext);

export const UrlFragmentContextProvider: FC<PropsWithChildren> = (props) => {
    const [lat, _setLat] = useState<number>(() => {
        const fromConfig = process.env.owmf_default_center_lat ? parseFloat(process.env.owmf_default_center_lat) : undefined;
        return (fromConfig !== undefined && !isNaN(fromConfig)) ? fromConfig : DEFAULT_LATITUDE;
    }),
        [lon, setLon] = useState<number>(() => {
            const fromConfig = process.env.owmf_default_center_lon ? parseFloat(process.env.owmf_default_center_lon) : undefined;
            return (fromConfig !== undefined && !isNaN(fromConfig)) ? fromConfig : DEFAULT_LONGITUDE;
        }),
        [zoom, _setZoom] = useState<number>(() => {
            const fromConfig = process.env.owmf_default_zoom ? parseInt(process.env.owmf_default_zoom) : undefined;
            return (fromConfig !== undefined && !isNaN(fromConfig)) ? fromConfig : DEFAULT_ZOOM;
        }),
        [colorSchemeID, setColorSchemeID] = useState<ColorSchemeID>(() => {
            const fromConfig = process.env.owmf_default_color_scheme as ColorSchemeID;
            return (fromConfig && Object.values(ColorSchemeID).includes(fromConfig)) ? fromConfig : DEFAULT_COLOR_SCHEME;
        }),
        [backEndID, setBackEndID] = useState<string>(() => {
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            return process.env.owmf_default_backend || DEFAULT_BACKEND_ID;
        }),
        [backgroundStyleID, setBackgroundStyleID] = useState<string>(() => {
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            return process.env.owmf_default_background_style || DEFAULT_BACKGROUND_STYLE_ID;
        }),
        [sourcePresetID, setSourcePresetID] = useState<string>(() => {
            const availablePresets = process.env.owmf_source_presets ? parseStringArrayConfig(process.env.owmf_source_presets) : undefined;
            return availablePresets?.length ? availablePresets[0] : DEFAULT_SOURCE_PRESET_ID;
        }),
        setLat = useCallback((lat: number) => {
            if (isNaN(lat) || lat < -90 || lat > 90)
                throw new Error(`Invalid latitude: ${lat}`);
            else
                _setLat(lat);
        }, [_setLat]),
        setZoom: Dispatch<SetStateAction<number>> = useCallback((zoom) => {
            if (typeof zoom === "number" && (isNaN(zoom) || zoom < 0 || zoom > 20))
                throw new Error(`Invalid zoom: ${zoom}`);
            else
                _setZoom(zoom);
        }, [_setZoom]);

    /** Load URL fragment on initial load */
    useEffect(() => {
        const splitFragment = window.location.hash.split(',') ?? [],
            latitudeFromFragmentRaw = splitFragment[LATITUDE_POSITION],
            latitudeFromFragment = latitudeFromFragmentRaw ? parseFloat(latitudeFromFragmentRaw) : undefined;
        if (latitudeFromFragment !== undefined && !isNaN(latitudeFromFragment))
            setLat(latitudeFromFragment);

        const longitudeFromFragmentRaw = splitFragment[LONGITUDE_POSITION],
            longitudeFromFragment = longitudeFromFragmentRaw ? parseFloat(longitudeFromFragmentRaw) : undefined;
        if (longitudeFromFragment !== undefined && !isNaN(longitudeFromFragment))
            setLon(longitudeFromFragment);

        const zoomFromFragmentRaw = splitFragment[ZOOM_POSITION],
            zoomFromFragment = zoomFromFragmentRaw ? parseFloat(zoomFromFragmentRaw) : undefined;
        if (zoomFromFragment !== undefined && !isNaN(zoomFromFragment))
            setZoom(zoomFromFragment);

        const colorSchemeFromFragment = splitFragment[COLOR_SCHEME_POSITION];
        if (colorSchemeFromFragment && Object.values(ColorSchemeID).includes(colorSchemeFromFragment as ColorSchemeID))
            setColorSchemeID(colorSchemeFromFragment as ColorSchemeID);

        const backEndFromFragment = splitFragment[BACK_END_POSITION];
        if (backEndFromFragment)
            setBackEndID(backEndFromFragment);

        const backgroundStyleFromFragment = splitFragment[BACKGROUND_STYLE_POSITION],
            backgroundStyleFromQueryString = window.location.search ? new URLSearchParams(window.location.search).get("style") : null;
        if (backgroundStyleFromFragment)
            setBackgroundStyleID(backgroundStyleFromFragment);
        else if (backgroundStyleFromQueryString)
            setBackgroundStyleID(backgroundStyleFromQueryString);

        const sourcePresetFromFragment = splitFragment[PRESET_POSITION];
        if (sourcePresetFromFragment)
            setSourcePresetID(sourcePresetFromFragment);
    }, [setLat, setZoom]);

    /** Update the URL fragment on state change */
    useEffect(() => {
        const strLon = lon.toFixed(4),
            strLat = lat.toFixed(4),
            strZoom = zoom.toFixed(1);

        const fragment = `#${strLat},${strLon},${strZoom},${colorSchemeID},${backEndID},${backgroundStyleID},${sourcePresetID}`;
        if (window.location.hash !== fragment) {
            if (process.env.NODE_ENV === 'development') console.debug("setFragmentParams: CHANGE DETECTED", { old: window.location.hash, new: fragment, lon, lat, zoom, colorSchemeID, backEndID, backgroundStyleID, templateID: sourcePresetID });
            window.location.hash = fragment;
        } else {
            if (process.env.NODE_ENV === 'development') console.debug("setFragmentParams: no change", { fragment, lon, lat, zoom, colorSchemeID, backEndID, backgroundStyleID, templateID: sourcePresetID });
        }

    }, [lon, lat, zoom, colorSchemeID, backEndID, backgroundStyleID, sourcePresetID]);

    return <UrlFragmentContext.Provider value={{ lon, setLon, lat, setLat, zoom, setZoom, colorSchemeID, setColorSchemeID, backEndID, setBackEndID, backgroundStyleID, setBackgroundStyleID, sourcePresetID, setSourcePresetID }}>
        {props.children}
    </UrlFragmentContext.Provider>;
}
