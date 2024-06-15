import { parseBoolConfig } from "@/src/config";
import { BackgroundStyle, jawgStyle, mapboxStyle, maptilerStyle, stadiaStyle } from "@/src/model/backgroundStyle";

export function getBackgroundStyles() {
    const maptiler_key = process.env.owmf_maptiler_key,
        enable_stadia_maps = parseBoolConfig(process.env.owmf_enable_stadia_maps),
        jawg_token = process.env.owmf_jawg_token,
        mapbox_token = process.env.owmf_mapbox_token,
        backgroundStyles: BackgroundStyle[] = [];

    if (mapbox_token) {
        backgroundStyles.push(
            mapboxStyle('mapbox_streets', 'Streets', 'mapbox', 'streets-v12', mapbox_token),
            mapboxStyle('mapbox_outdoors', 'Outdoors', 'mapbox', 'outdoors-v12', mapbox_token),
            mapboxStyle('mapbox_light', 'Light', 'mapbox', 'light-v11', mapbox_token),
            mapboxStyle('mapbox_dark', 'Dark', 'mapbox', 'dark-v11', mapbox_token),
            mapboxStyle('mapbox_satellite', 'Satellite', 'mapbox', 'satellite-streets-v12', mapbox_token),
        );
    }

    if (enable_stadia_maps) {
        backgroundStyles.push(
            stadiaStyle('stadia_alidade_dark', "Alidade smooth dark", 'alidade_smooth_dark'),
            stadiaStyle('stadia_alidade', "Alidade smooth", 'alidade_smooth'),
            //stadiaStyle('stadia_satellite', "Alidade Satellite", 'alidade_satellite'),
            stadiaStyle('stadia_outdoors', "Outdoors", 'outdoors'),
            stadiaStyle('stadia_osm_bright', "OSM Bright", 'osm_bright'),
            stadiaStyle('stamen_terrain', "Stamen Terrain", 'stamen_terrain'),
            stadiaStyle('stamen_toner', "Stamen Toner", 'stamen_toner'),
            stadiaStyle('stamen_toner_lite', "Stamen Toner Lite", 'stamen_toner_lite'),
            stadiaStyle('stamen_watercolor', "Stamen Watercolor", 'stamen_watercolor'),
        );
    }

    if (jawg_token) {
        backgroundStyles.push(
            jawgStyle('jawg_streets', 'Streets', 'jawg-streets', jawg_token),
            jawgStyle('jawg_streets_3d', 'Streets 3D', 'jawg-streets', jawg_token, true),
            jawgStyle('jawg_lagoon', 'Lagoon', 'jawg-lagoon', jawg_token),
            jawgStyle('jawg_lagoon_3d', 'Lagoon 3D', 'jawg-lagoon', jawg_token, true),
            jawgStyle('jawg_sunny', 'Sunny', 'jawg-sunny', jawg_token),
            jawgStyle('jawg_light', 'Light', 'jawg-light', jawg_token),
            jawgStyle('jawg_terrain', 'Terrain', 'jawg-terrain', jawg_token),
            jawgStyle('jawg_dark', 'Dark', 'jawg-dark', jawg_token),
        );
    }

    backgroundStyles.push({
        id: "americana", vendorText: "OpenStreetMap US", styleText: "OSM Americana", styleUrl: "https://zelonewolf.github.io/openstreetmap-americana/style.json", keyPlaceholder: 'https://tile.ourmap.us/data/v3.json', key: 'https://tiles.stadiamaps.com/data/openmaptiles.json'
    });

    if (maptiler_key) {
        backgroundStyles.push(
            { id: "liberty", vendorText: "Maputnik", styleText: "OSM Liberty", styleUrl: "https://maputnik.github.io/osm-liberty/style.json", keyPlaceholder: '{key}', key: maptiler_key },
            maptilerStyle('maptiler_backdrop', 'Backdrop', 'backdrop', maptiler_key),
            maptilerStyle('maptiler_basic', 'Basic', 'basic-v2', maptiler_key),
            maptilerStyle('maptiler_bright', 'Bright', 'bright-v2', maptiler_key),
            maptilerStyle('maptiler_dataviz', 'Dataviz', 'dataviz', maptiler_key),
            maptilerStyle('maptiler_dark', 'Dark', 'dataviz-dark', maptiler_key),
            maptilerStyle('maptiler_ocean', 'Ocean', 'ocean', maptiler_key),
            maptilerStyle('maptiler_osm_carto', 'OSM Carto', 'openstreetmap', maptiler_key),
            maptilerStyle('maptiler_outdoors', 'Outdoors', 'outdoor-v2', maptiler_key),
            maptilerStyle('maptiler_satellite_hybrid', 'Satellite', 'hybrid', maptiler_key),
            maptilerStyle('maptiler_streets', 'Streets', 'streets-v2', maptiler_key),
            maptilerStyle('maptiler_toner', 'Toner', 'toner-v2', maptiler_key),
            maptilerStyle('maptiler_topo', 'Topo', 'topo-v2', maptiler_key),
            maptilerStyle('maptiler_winter', 'Winter', "winter-v2", maptiler_key),
        );
    }
    return backgroundStyles;
}