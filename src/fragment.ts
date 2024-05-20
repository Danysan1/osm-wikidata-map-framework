import { ColorSchemeID } from "./model/colorScheme";
import { getConfig, getFloatConfig, getStringArrayConfig } from "./config";
import { DEFAULT_SOURCE_PRESET_ID } from "./model/SourcePreset";

const default_center_lat = getFloatConfig("default_center_lat") ?? 0,
    default_center_lon = getFloatConfig("default_center_lon") ?? 0,
    default_zoom_raw = getConfig("default_zoom"),
    default_zoom = default_zoom_raw ? parseInt(default_zoom_raw) : 1,
    defaultColorSchemeRaw = getConfig("default_color_scheme"),
    defaultColorScheme = defaultColorSchemeRaw && defaultColorSchemeRaw in ColorSchemeID ? defaultColorSchemeRaw as ColorSchemeID : ColorSchemeID.blue,
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    defaultBackgroundStyleID = new URLSearchParams(window.location.search).get("style") || getConfig("default_background_style") || "stadia_alidade",
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    defaultBackEndID = getConfig("default_backend") || "overpass_all",
    sourcePresetIDs = getStringArrayConfig("source_presets"),
    defaultSourcePresetID = sourcePresetIDs?.length ? sourcePresetIDs[0] : DEFAULT_SOURCE_PRESET_ID;

interface FragmentParams {
    lon: number | null;
    lat: number | null;
    zoom: number | null;
    colorScheme: string | null;
    backEndID: string | null;
    backgroundStyleID: string | null;
    sourcePresetID: string | null;
}

export interface CorrectFragmentParams {
    lon: number;
    lat: number;
    zoom: number;
    colorScheme: ColorSchemeID;
    backEndID: string;
    backgroundStyleID: string;
    sourcePresetID: string;
}

export class UrlFragment {
    /**
     * Gets the parameters passed through the fragment
     */
    public getFragmentParams(): FragmentParams {
        const hashParams = window.location.hash ? window.location.hash.substring(1).split(",") : null,
            out: FragmentParams = {
                lon: (hashParams?.[0] && !isNaN(parseFloat(hashParams[0]))) ? parseFloat(hashParams[0]) : null,
                lat: (hashParams?.[1] && !isNaN(parseFloat(hashParams[1]))) ? parseFloat(hashParams[1]) : null,
                zoom: (hashParams?.[2] && !isNaN(parseFloat(hashParams[2]))) ? parseFloat(hashParams[2]) : null,
                colorScheme: hashParams?.[3] ?? null,
                backEndID: hashParams?.[4] ?? null,
                backgroundStyleID: hashParams?.[5] ?? null,
                sourcePresetID: hashParams?.[6] ?? null,
            };
        // if (process.env.NODE_ENV === 'development') console.debug("getFragmentParams", { hashParams, out });
        return out;
    }

    /**
     * Update the URL fragment with the given parameters.
     * If a parameter is !== undefined it is updated in the fragment.
     * If it is === undefined it is left untouched.
     */
    public setFragmentParams(
        lon?: number,
        lat?: number,
        zoom?: number,
        colorScheme?: ColorSchemeID,
        backEndID?: string,
        backgroundStyleID?: string,
        sourcePresetID?: string
    ): string {
        const current = this.getCorrectFragmentParams(),
            strLon = lon !== undefined ? lon.toFixed(4) : current.lon,
            strLat = lat !== undefined ? lat.toFixed(4) : current.lat,
            strZoom = zoom !== undefined ? zoom.toFixed(1) : current.zoom,
            strColorScheme = colorScheme ?? current.colorScheme,
            strBackEnd = backEndID ?? current.backEndID,
            strBackground = backgroundStyleID ?? current.backgroundStyleID,
            strTemplate = sourcePresetID ?? current.sourcePresetID;

        const fragment = `#${strLon},${strLat},${strZoom},${strColorScheme},${strBackEnd},${strBackground},${strTemplate}`;
        if (window.location.hash !== fragment) {
            if (process.env.NODE_ENV === 'development') console.debug("setFragmentParams", { current, fragment, lon, lat, zoom, colorScheme, backEndID, backgroundStyleID, templateID: sourcePresetID });
            window.location.hash = fragment;
        } else {
            if (process.env.NODE_ENV === 'development') console.debug("setFragmentParams: no change", { current, fragment, lon, lat, zoom, colorScheme, backEndID, backgroundStyleID, templateID: sourcePresetID });
        }
        return fragment;
    }

    public getCorrectFragmentParams(): CorrectFragmentParams {
        const raw = this.getFragmentParams(),
            correct: CorrectFragmentParams = {
                lon: raw.lon ?? default_center_lon,
                lat: raw.lat !== null && raw.lat >= -90 && raw.lat <= 90 ? raw.lat : default_center_lat,
                zoom: raw.zoom ? raw.zoom : default_zoom,
                colorScheme: raw.colorScheme && raw.colorScheme in ColorSchemeID ? raw.colorScheme as ColorSchemeID : defaultColorScheme,
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                backEndID: raw.backEndID?.replace("db_", "pmtiles_") || defaultBackEndID,
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                backgroundStyleID: raw.backgroundStyleID || defaultBackgroundStyleID,
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                sourcePresetID: raw.sourcePresetID || defaultSourcePresetID,
            };
        //if (process.env.NODE_ENV === 'development') console.debug("getCorrectFragmentParams", { raw, correct });
        return correct;
    }

    public get lon() {
        return this.getCorrectFragmentParams().lon;
    }

    public set lon(lon: number) {
        this.setFragmentParams(lon);
    }

    public get lat() {
        return this.getCorrectFragmentParams().lat;
    }

    public set lat(lat: number) {
        this.setFragmentParams(undefined, lat);
    }

    public get zoom() {
        return this.getCorrectFragmentParams().zoom;
    }

    public set zoom(zoom: number) {
        this.setFragmentParams(undefined, undefined, zoom);
    }

    public get colorScheme() {
        return this.getCorrectFragmentParams().colorScheme;
    }

    public set colorScheme(colorSchemeID: ColorSchemeID) {
        this.setFragmentParams(undefined, undefined, undefined, colorSchemeID);
    }

    public get backEnd() {
        return this.getCorrectFragmentParams().backEndID;
    }

    public set backEnd(backEndID: string) {
        this.setFragmentParams(undefined, undefined, undefined, undefined, backEndID);
    }

    public get backgroundStyle() {
        return this.getCorrectFragmentParams().backgroundStyleID;
    }

    public set backgroundStyle(backgroundStyleID: string) {
        this.setFragmentParams(undefined, undefined, undefined, undefined, undefined, backgroundStyleID);
    }

    public get sourcePreset() {
        return this.getCorrectFragmentParams().sourcePresetID;
    }

    public set sourcePreset(sourcePresetID: string) {
        this.setFragmentParams(undefined, undefined, undefined, undefined, undefined, undefined, sourcePresetID);
    }
}
