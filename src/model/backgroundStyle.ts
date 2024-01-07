export interface BackgroundStyle {
    id: string;
    vendorText: string,
    styleText: string;
    styleUrl: string;
    keyPlaceholder?: string;
    key?: string
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
