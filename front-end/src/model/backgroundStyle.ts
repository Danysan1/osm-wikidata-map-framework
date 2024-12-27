export interface BackgroundStyle {
    /** Univocally identifies the style */
    id: string;

    /** Name of the vendor to display in the UI */
    vendorText: string,
    
    /** Name of the style to display in the UI */
    styleText: string;
    
    /** URL of the style JSON */
    styleUrl: string;
    
    /** Placeholder text for the API key */
    keyPlaceholder?: string;
    
    /** API key to use for this style, necessary only if keyPlaceholder is specified */
    key?: string

    /** Whether the data can be filtered by the start_decdate and end_decdate fields */
    canFilterByDecDate?: boolean;
}

/**
 * @see https://cloud.maptiler.com/maps/
 */
export function maptilerStyle(id: string, text: string, maptilerId: string, maptilerKey: string): BackgroundStyle {
    return {
        id: id,
        vendorText: "Maptiler",
        styleText: text,
        styleUrl: `https://api.maptiler.com/maps/${maptilerId}/style.json?key=${maptilerKey}`
    };
}

/**
 * @see https://shortbread-tiles.org/styles/
 * @see https://github.com/versatiles-org/versatiles-style
 */
export function versaTilesStyle(id: string, text: string, versaTilesID: string): BackgroundStyle {
    return {
        id: id,
        vendorText: "VersaTiles",
        styleText: text,
        styleUrl: `https://tiles.versatiles.org/assets/styles/${versaTilesID}.json`
    };
}

/**
 * @see https://tiles.stadiamaps.com/data/openmaptiles.json
 * @see https://docs.stadiamaps.com/themes/
 */
export function stadiaStyle(id: string, text: string, stadiaID: string): BackgroundStyle {
    return {
        id: id,
        vendorText: "Stadia Maps",
        styleText: text,
        styleUrl: `https://tiles.stadiamaps.com/styles/${stadiaID}.json`
    };
}

/**
 * @see https://docs.mapbox.com/api/maps/vector-tiles/
 * @see https://docs.mapbox.com/api/maps/styles/#mapbox-styles
 */
export function mapboxStyle(id: string, text: string, mapboxUser: string, mapboxId: string, mapboxToken: string): BackgroundStyle {
    return {
        id: id,
        vendorText: "Mapbox",
        styleText: text,
        styleUrl: `https://api.mapbox.com/styles/v1/${mapboxUser}/${mapboxId}/?access_token=${mapboxToken}`
    };
}

/**
 * @see https://www.jawg.io/en/maps/
 * @see https://www.jawg.io/lab/styles
 * @see https://www.jawg.io/docs/integration/maplibre-gl-js/change-style/
 */
export function jawgStyle(id: string, text: string, jawgId: string, jawgToken: string, extrude = false): BackgroundStyle {
    return {
        id: id,
        vendorText: "Jawg Maps",
        styleText: text,
        styleUrl: `https://api.jawg.io/styles/${jawgId}.json?extrude=${extrude}&access-token=${jawgToken}`
    };
}

/**
 * @see https://wiki.openstreetmap.org/wiki/OpenHistoricalMap/Reuse#Vector_tiles_and_stylesheets
 */
export function openHistoricalMapStyle(id: string, text: string, ohmId: string): BackgroundStyle {
    return {
        canFilterByDecDate: true,
        id: id,
        vendorText: "OpenHistoricalMap",
        styleText: text,
        styleUrl: `https://www.openhistoricalmap.org/map-styles/${ohmId}.json`
    };
}
