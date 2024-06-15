'use client';
import { IDEditorControl } from "@/src/components/controls/IDEditorControl";
import MapCompleteControl from '@/src/components/controls/MapCompleteControl';
import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import { SourcePreset } from '@/src/model/SourcePreset';
import { MapService } from '@/src/services/MapService';
import { fetchSourcePreset } from "@/src/services/PresetService";
import { showSnackbar } from "@/src/snackbar";
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import Map, { FullscreenControl, GeolocateControl, NavigationControl, ScaleControl, ViewStateChangeEvent } from 'react-map-gl/maplibre';
import { OsmWikidataMatcherControl } from "../controls/OsmWikidataMatcherControl";
import { getBackgroundStyles } from './backgroundStyles';

export const OwmfMap = () => {
    const { lon, setLon, lat, setLat, zoom, setZoom, colorScheme, setColorScheme, backEndID, setBackEndID, backgroundStyleID, setBackgroundStyleID, sourcePresetID, setSourcePresetID } = useUrlFragmentContext(),
        [sourcePreset, setSourcePreset] = useState<SourcePreset | null>(null),
        [backEndService, setBackEndService] = useState<MapService | null>(null),
        backgroundStyles = useMemo(() => getBackgroundStyles(), []),
        backgroundStyle = useMemo(() => backgroundStyles.find(style => style.id === backgroundStyleID), [backgroundStyles, backgroundStyleID]),
        minZoomLevel = useMemo(() => parseInt(process.env.owmf_min_zoom_level ?? "9"), []);

    const onMoveEndHandler = useCallback((e: ViewStateChangeEvent) => {
        const center = e.target.getCenter();
        setLon(center.lng);
        setLat(center.lat);
        setZoom(e.target.getZoom());
    }, [setLat, setLon, setZoom]);

    useEffect(() => {
        // https://nextjs.org/docs/app/api-reference/functions/generate-metadata#resource-hints
        if (process.env.owmf_default_language) ReactDOM.preload(`locales/${process.env.owmf_default_language}/common.json`, { as: "fetch", crossOrigin: "anonymous" });
        if (process.env.owmf_pmtiles_base_url) ReactDOM.preload(`${process.env.owmf_pmtiles_base_url}/date.txt`, { as: "fetch", crossOrigin: "anonymous" });
        if (process.env.owmf_default_background_style === "stadia_alidade") ReactDOM.preload("https://tiles.stadiamaps.com/styles/alidade_smooth.json", { as: "fetch", crossOrigin: "anonymous" });
        if (process.env.owmf_default_background_style?.startsWith("stadia_")) ReactDOM.preload("https://tiles.stadiamaps.com/data/openmaptiles.json", { as: "fetch", crossOrigin: "anonymous" });
        if (process.env.owmf_default_background_sty === "stamen_toner_lite") ReactDOM.preload("https://tiles.stadiamaps.com/styles/stamen_toner_lite.json", { as: "fetch", crossOrigin: "anonymous" });
        if (process.env.owmf_default_background_style === "stamen_toner") ReactDOM.preload("https://tiles.stadiamaps.com/styles/stamen_toner.json", { as: "fetch", crossOrigin: "anonymous" });
        if (process.env.owmf_default_background_style?.startsWith("stamen_")) ReactDOM.preload("https://tiles.stadiamaps.com/data/stamen-omt.json", { as: "fetch", crossOrigin: "anonymous" });
    }, []);

    useEffect(() => {
        const initialBackgroundStyle = backgroundStyle ?? backgroundStyles[0];
        if (backgroundStyle !== initialBackgroundStyle) {
            console.warn("Empty default background style, using the first available", { backgroundStyle, backgroundStyles, initialBackgroundStyle });
            setBackgroundStyleID(initialBackgroundStyle.id);
        }
    }, [backgroundStyle, backgroundStyles, setBackgroundStyleID]);

    useEffect(() => {
        if (!!process.env.REACT_APP_FETCHING_PRESET || sourcePreset?.id === sourcePresetID) {
            if (process.env.NODE_ENV === 'development') console.warn("Skipping redundant source preset fetch", { alreadyFetching: process.env.REACT_APP_FETCHING_PRESET, new: sourcePresetID, old: sourcePreset?.id });
            return;
        }

        process.env.REACT_APP_FETCHING_PRESET = "1";
        if (process.env.NODE_ENV === 'development') console.debug("Fetching source preset", { alreadyUpdating: process.env.REACT_APP_UPDATING_PRESET, new: sourcePresetID, old: sourcePreset?.id });
        fetchSourcePreset(sourcePresetID).then(newPreset => {
            setSourcePreset(oldPreset => {
                if (oldPreset?.id === newPreset.id) {
                    if (process.env.NODE_ENV === 'development') console.warn("Skipping redundant source preset update", { old: oldPreset?.id, new: newPreset.id });
                    return oldPreset;
                }

                if (process.env.NODE_ENV === 'development') console.debug("Updating source preset", { old: oldPreset?.id, new: newPreset.id });
                return newPreset;
            });
        }).catch(e => {
            //setBackEndService(null);
            //setSourcePreset(null);
            console.error("Failed updating source preset", e);
            showSnackbar("snackbar.map_error");
        }).finally(() => {
            process.env.REACT_APP_FETCHING_PRESET = undefined;
        });
    }, [sourcePreset?.id, sourcePresetID]);

    return <Map
        mapLib={import('maplibre-gl')}
        initialViewState={{
            longitude: lon,
            latitude: lat,
            zoom: zoom
        }}
        //style={{ width: 600, height: 400 }}
        mapStyle={backgroundStyle?.styleUrl}
        onMoveEnd={onMoveEndHandler}
    >
        {sourcePreset?.mapcomplete_theme && <MapCompleteControl minZoomLevel={minZoomLevel} mapComplete_theme={sourcePreset?.mapcomplete_theme} position="top-left" />}

        <NavigationControl visualizePitch position="top-right" />
        <GeolocateControl positionOptions={{ enableHighAccuracy: true }} trackUserLocation={false} position="top-right" />
        <FullscreenControl position="top-right" />
        <IDEditorControl minZoomLevel={minZoomLevel} position="top-right" />
        <OsmWikidataMatcherControl minZoomLevel={minZoomLevel} position="top-right" />

        <ScaleControl position="bottom-right" />
    </Map>;
}
