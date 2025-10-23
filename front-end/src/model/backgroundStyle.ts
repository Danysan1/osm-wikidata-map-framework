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
    canFilterByDate?: boolean;

    customFonts?: string[]
}

const MAPTILER_KEY = process.env.NEXT_PUBLIC_OWMF_maptiler_key,
    JAWG_TOKEN = process.env.NEXT_PUBLIC_OWMF_jawg_token,
    TRACESTRACK_KEY = process.env.NEXT_PUBLIC_OWMF_tracestrack_key,
    MAPBOX_TOKEN = process.env.NEXT_PUBLIC_OWMF_mapbox_token,
    ENABLE_VERSATILES = process.env.NEXT_PUBLIC_OWMF_enable_versatiles === "true",
    ENABLE_STADIA = process.env.NEXT_PUBLIC_OWMF_enable_stadia_maps === "true",
    ENABLE_OHM = process.env.NEXT_PUBLIC_OWMF_enable_open_historical_map === "true",
    ENABLE_OSMF = process.env.NEXT_PUBLIC_OWMF_enable_osmf_tiles === "true";

/**
 * @see https://cloud.maptiler.com/maps/
 */
function maptilerStyle(id: string, text: string, maptilerId: string): BackgroundStyle {
    return {
        id: id,
        vendorText: "Maptiler",
        styleText: text,
        keyPlaceholder: "{key}",
        key: MAPTILER_KEY,
        styleUrl: `https://api.maptiler.com/maps/${maptilerId}/style.json?key=${MAPTILER_KEY}`
    };
}

/**
 * @see https://shortbread-tiles.org/styles/
 * @see https://github.com/versatiles-org/versatiles-style
 */
function versaTilesStyle(id: string, text: string, versaTilesID: string): BackgroundStyle {
    return {
        id: id,
        vendorText: "VersaTiles",
        customFonts: ["noto_sans_regular"],
        styleText: text,
        styleUrl: `https://tiles.versatiles.org/assets/styles/${versaTilesID}/style.json`
    };
}

/**
 * @see https://tiles.stadiamaps.com/data/openmaptiles.json
 * @see https://docs.stadiamaps.com/themes/
 */
function stadiaStyle(id: string, text: string, stadiaID: string): BackgroundStyle {
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
function mapboxStyle(id: string, text: string, mapboxUser: string, mapboxId: string): BackgroundStyle {
    return {
        id: id,
        vendorText: "Mapbox",
        styleText: text,
        styleUrl: `https://api.mapbox.com/styles/v1/${mapboxUser}/${mapboxId}/?access_token=${MAPBOX_TOKEN}`
    };
}

/**
 * @see https://tracestrack.com/category/maps/
 * @see https://console.tracestrack.com/vector-explorer
 */
function tracestrackStyle(text: string, tracestrackId: string): BackgroundStyle {
    return {
        id: `tracestrack_${tracestrackId}`,
        vendorText: "Tracestrack",
        styleText: text,
        styleUrl: `https://tile.tracestrack.com/v/maps/${tracestrackId}/style.json?key=${TRACESTRACK_KEY}`
    };
}

/**
 * @see https://www.jawg.io/en/maps/
 * @see https://www.jawg.io/lab/styles
 * @see https://www.jawg.io/docs/integration/maplibre-gl-js/change-style/
 */
function jawgStyle(id: string, text: string, jawgId: string, extrude = false): BackgroundStyle {
    return {
        id: id,
        vendorText: "Jawg Maps",
        styleText: text,
        styleUrl: `https://api.jawg.io/styles/${jawgId}.json?extrude=${extrude}&access-token=${JAWG_TOKEN}`
    };
}

/**
 * @see https://wiki.openstreetmap.org/wiki/OpenHistoricalMap/Reuse#Vector_tiles_and_stylesheets
 */
function openHistoricalMapStyle(id: string, text: string, ohmId: string): BackgroundStyle {
    return {
        canFilterByDate: true,
        id: id,
        vendorText: "OpenHistoricalMap",
        styleText: text,
        styleUrl: `https://www.openhistoricalmap.org/map-styles/${ohmId}.json`
    };
}

export const BACKGROUND_STYLES: BackgroundStyle[] = [];

if (TRACESTRACK_KEY) {
    BACKGROUND_STYLES.push(
        tracestrackStyle("Carto", "carto")
        // tracestrackStyle("Lite", "lite"),
        // tracestrackStyle("Dark", "dark")
    );
}

if (MAPBOX_TOKEN) {
    BACKGROUND_STYLES.push(
        mapboxStyle("mapbox_streets", "Streets", "mapbox", "streets-v12"),
        mapboxStyle("mapbox_outdoors", "Outdoors", "mapbox", "outdoors-v12"),
        mapboxStyle("mapbox_light", "Light", "mapbox", "light-v11"),
        mapboxStyle("mapbox_dark", "Dark", "mapbox", "dark-v11"),
        mapboxStyle("mapbox_satellite", "Satellite", "mapbox", "satellite-streets-v12")
    );
}

if (ENABLE_VERSATILES) {
    BACKGROUND_STYLES.push(
        versaTilesStyle("versatiles_colorful", "Colorful", "colorful"),
        versaTilesStyle("versatiles_neutrino", "Neutrino", "neutrino"),
        versaTilesStyle("versatiles_eclipse", "Eclipse", "eclipse"),
        versaTilesStyle("versatiles_graybeard", "Graybeard", "graybeard")
    );
}

if (ENABLE_STADIA) {
    BACKGROUND_STYLES.push(
        stadiaStyle("stadia_alidade_dark", "Alidade smooth dark", "alidade_smooth_dark"),
        stadiaStyle("stadia_alidade", "Alidade smooth", "alidade_smooth"),
        //stadiaStyle('stadia_satellite', "Alidade Satellite", 'alidade_satellite'),
        stadiaStyle("stadia_outdoors", "Outdoors", "outdoors"),
        stadiaStyle("stadia_osm_bright", "OSM Bright", "osm_bright"),
        stadiaStyle("stamen_terrain", "Stamen Terrain", "stamen_terrain"),
        stadiaStyle("stamen_toner", "Stamen Toner", "stamen_toner"),
        stadiaStyle("stamen_toner_lite", "Stamen Toner Lite", "stamen_toner_lite"),
        stadiaStyle("stamen_watercolor", "Stamen Watercolor", "stamen_watercolor"),
        {
            id: "americana",
            vendorText: "OpenStreetMap US",
            styleText: "OSM Americana",
            styleUrl: "https://americanamap.org/style.json",
            keyPlaceholder: "https://tile.ourmap.us/data/v3.json",
            key: "https://tiles.stadiamaps.com/data/openmaptiles.json",
        }
    );
}

if (JAWG_TOKEN) {
    BACKGROUND_STYLES.push(
        jawgStyle("jawg_streets", "Streets", "jawg-streets"),
        jawgStyle("jawg_streets_3d", "Streets 3D", "jawg-streets", true),
        jawgStyle("jawg_lagoon", "Lagoon", "jawg-lagoon"),
        jawgStyle("jawg_lagoon_3d", "Lagoon 3D", "jawg-lagoon", true),
        jawgStyle("jawg_sunny", "Sunny", "jawg-sunny"),
        jawgStyle("jawg_light", "Light", "jawg-light"),
        jawgStyle("jawg_terrain", "Terrain", "jawg-terrain"),
        jawgStyle("jawg_dark", "Dark", "jawg-dark")
    );
}

if (MAPTILER_KEY) {
    BACKGROUND_STYLES.push(
        {
            id: "liberty",
            vendorText: "Maputnik",
            styleText: "OSM Liberty",
            styleUrl: "https://maputnik.github.io/osm-liberty/style.json",
            keyPlaceholder: "{key}",
            key: MAPTILER_KEY,
        },
        maptilerStyle("maptiler_backdrop", "Backdrop", "backdrop"),
        maptilerStyle("maptiler_basic", "Basic", "basic-v2"),
        maptilerStyle("maptiler_bright", "Bright", "bright-v2"),
        maptilerStyle("maptiler_dataviz", "Dataviz", "dataviz"),
        maptilerStyle("maptiler_dark", "Dark", "dataviz-dark"),
        maptilerStyle("maptiler_ocean", "Ocean", "ocean"),
        maptilerStyle("maptiler_osm_carto", "OSM Carto", "openstreetmap"),
        maptilerStyle("maptiler_outdoors", "Outdoors", "outdoor-v2"),
        maptilerStyle("maptiler_satellite_hybrid", "Satellite", "hybrid"),
        maptilerStyle("maptiler_streets", "Streets", "streets-v2"),
        maptilerStyle("maptiler_toner", "Toner", "toner-v2"),
        maptilerStyle("maptiler_topo", "Topo", "topo-v2"),
        maptilerStyle("maptiler_winter", "Winter", "winter-v2")
    );
}

if (ENABLE_OHM) {
    BACKGROUND_STYLES.push(
        openHistoricalMapStyle("ohm_main", "Historic", "main/main"),
        openHistoricalMapStyle("ohm_rail", "Railway", "rail/rail"),
        openHistoricalMapStyle(
            "ohm_ja_scroll",
            "Japanese scroll",
            "japanese_scroll/ohm-japanese-scroll-map"
        ),
        openHistoricalMapStyle("ohm_woodblock", "Woodblock", "woodblock/woodblock")
    );
}

if (ENABLE_OSMF) {
    BACKGROUND_STYLES.push({
        id: "osmf_colorful",
        styleText: "OSMF Colorful",
        styleUrl: "https://vector.openstreetmap.org/demo/shortbread/colorful.json",
        vendorText: "OpenStreetMap Foundation",
        keyPlaceholder: "\"/",
        key: "\"https://vector.openstreetmap.org/",
    });
    BACKGROUND_STYLES.push({
        id: "osmf_eclipse",
        styleText: "OSMF Eclipse",
        styleUrl: "https://vector.openstreetmap.org/demo/shortbread/eclipse.json",
        vendorText: "OpenStreetMap Foundation",
        keyPlaceholder: "\"/",
        key: "\"https://vector.openstreetmap.org/",
    });
}