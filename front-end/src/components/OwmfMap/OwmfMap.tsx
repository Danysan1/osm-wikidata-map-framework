'use client';
import { IDEditorControl } from "@/src/components/controls/IDEditorControl";
import { MapCompleteControl } from '@/src/components/controls/MapCompleteControl';
import { parseBoolConfig } from "@/src/config";
import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import { loadTranslator } from "@/src/i18n/client";
import { SourcePreset } from '@/src/model/SourcePreset';
import { colorSchemes } from "@/src/model/colorScheme";
import { CombinedCachedMapService } from "@/src/services/CombinedCachedMapService";
import { MapService } from '@/src/services/MapService';
import { fetchSourcePreset } from "@/src/services/PresetService";
import { showSnackbar } from "@/src/snackbar";
import { RequestTransformFunction, addProtocol } from "maplibre-gl";
import 'maplibre-gl/dist/maplibre-gl.css';
import { isMapboxURL, transformMapboxUrl } from "maplibregl-mapbox-request-transformer";
import { useTranslation } from "next-i18next";
import { Protocol } from "pmtiles";
import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import Map, { FullscreenControl, GeolocateControl, MapGeoJSONFeature, NavigationControl, ScaleControl, ViewStateChangeEvent } from 'react-map-gl/maplibre';
import { useGeocodingControl } from '../../hooks/useGeocodingControl';
import { BackEndControl } from "../controls/BackEndControl";
import { LanguageControl } from "../controls/LanguageControl";
import { OsmWikidataMatcherControl } from "../controls/OsmWikidataMatcherControl";
import { QueryLinkControl } from "../controls/QueryLinkControl";
import { SourcePresetControl } from "../controls/SourcePresetControl";
import { ClusteredSourceAndLayers } from "../map/ClusteredSourceAndLayers";
import { GeoJsonSourceAndLayers } from "../map/GeoJsonSourceAndLayers";
import { PMTilesSourceAndLayers } from "../map/PMTilesSourceAndLayers";
import { getBackgroundStyles } from './backgroundStyles';
import mockDetailsData from './details.json';
import mockElementsData from './elements.json';

const PMTILES_PREFIX = "pmtiles",
    PMTILES_SOURCE = "pmtiles_source",
    DETAILS_SOURCE = "detail_source",
    ELEMENTS_SOURCE = "elements_source";

loadTranslator().catch(e => {
    if (process.env.NODE_ENV === 'development') console.error("Failed loading translator", e);
});

export const OwmfMap = () => {
    const { lon, setLon, lat, setLat, zoom, setZoom, colorSchemeID, setColorSchemeID, backEndID, setBackEndID, backgroundStyleID, setBackgroundStyleID, sourcePresetID, setSourcePresetID } = useUrlFragmentContext(),
        [sourcePreset, setSourcePreset] = useState<SourcePreset | null>(null),
        [backEndService, setBackEndService] = useState<MapService | null>(null),
        [openFeature, setOpenFeature] = useState<MapGeoJSONFeature | undefined>(undefined),
        backgroundStyles = useMemo(() => getBackgroundStyles(), []),
        backgroundStyle = useMemo(() => backgroundStyles.find(style => style.id === backgroundStyleID), [backgroundStyles, backgroundStyleID]),
        colorScheme = useMemo(() => colorSchemes[colorSchemeID], [colorSchemeID]),
        minZoomLevel = useMemo(() => parseInt(process.env.owmf_min_zoom_level ?? "9"), []),
        thresholdZoomLevel = useMemo(() => parseInt(process.env.owmf_threshold_zoom_level ?? "14"), []),
        [pmtilesReady, setPMTilesReady] = useState(false),
        enablePMTiles = useMemo(() => !!process.env.owmf_pmtiles_base_url && pmtilesReady && backEndID.startsWith(PMTILES_PREFIX), [backEndID, pmtilesReady]),
        pmtilesKeyID = useMemo(() => backEndID === "pmtiles_all" ? undefined : backEndID.replace("pmtiles_", ""), [backEndID]),
        elementsData = useMemo(() => backEndID.startsWith(PMTILES_PREFIX) ? null : mockElementsData, [backEndID]),
        detailsData = useMemo(() => backEndID.startsWith(PMTILES_PREFIX) ? null : mockDetailsData, [backEndID]),
        { t } = useTranslation();

    const onMoveEndHandler = useCallback((e: ViewStateChangeEvent) => {
        const center = e.target.getCenter();
        setLon(center.lng);
        setLat(center.lat);
        setZoom(e.target.getZoom());
    }, [setLat, setLon, setZoom]);

    const requestTransformFunction: RequestTransformFunction = useCallback((url, resourceType) => {
        if (process.env.owmf_mapbox_token && isMapboxURL(url))
            return transformMapboxUrl(url, resourceType as string, process.env.owmf_mapbox_token);

        if (/^http:\/\/[^/]+(?<!localhost)\/(elements|etymology_map)\//.test(url))
            return { url: url.replace("http", "https") };

        return { url };
    }, []);

    useEffect(() => {
        // https://nextjs.org/docs/app/api-reference/functions/generate-metadata#resource-hints
        if (process.env.owmf_default_language) ReactDOM.preload(`locales/${process.env.owmf_default_language}/common.json`, { as: "fetch", crossOrigin: "anonymous" });
        if (process.env.owmf_pmtiles_base_url) ReactDOM.preload(`${process.env.owmf_pmtiles_base_url}date.txt`, { as: "fetch", crossOrigin: "anonymous" });
        if (process.env.owmf_default_background_style === "stadia_alidade") ReactDOM.preload("https://tiles.stadiamaps.com/styles/alidade_smooth.json", { as: "fetch", crossOrigin: "anonymous" });
        if (process.env.owmf_default_background_style?.startsWith("stadia_")) ReactDOM.preload("https://tiles.stadiamaps.com/data/openmaptiles.json", { as: "fetch", crossOrigin: "anonymous" });
        if (process.env.owmf_default_background_sty === "stamen_toner_lite") ReactDOM.preload("https://tiles.stadiamaps.com/styles/stamen_toner_lite.json", { as: "fetch", crossOrigin: "anonymous" });
        if (process.env.owmf_default_background_style === "stamen_toner") ReactDOM.preload("https://tiles.stadiamaps.com/styles/stamen_toner.json", { as: "fetch", crossOrigin: "anonymous" });
        if (process.env.owmf_default_background_style?.startsWith("stamen_")) ReactDOM.preload("https://tiles.stadiamaps.com/data/stamen-omt.json", { as: "fetch", crossOrigin: "anonymous" });

    }, []);

    useEffect(() => {
        if (process.env.owmf_pmtiles_base_url) {
            const pmtilesProtocol = new Protocol();
            addProtocol("pmtiles", pmtilesProtocol.tile);
            setPMTilesReady(true);
        }
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
                setBackEndService(new CombinedCachedMapService(newPreset));
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

    useGeocodingControl({ position: "bottom-left" });

    return <Map
        mapLib={import('maplibre-gl')}
        RTLTextPlugin='https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js'
        initialViewState={{
            longitude: lon,
            latitude: lat,
            zoom: zoom
        }}
        //style={{ width: 600, height: 400 }}
        mapStyle={backgroundStyle?.styleUrl}
        onMoveEnd={onMoveEndHandler}
        transformRequest={requestTransformFunction}
    >

        <SourcePresetControl position="top-left" />
        {sourcePreset && <BackEndControl preset={sourcePreset} position="top-left" />}
        {sourcePreset?.mapcomplete_theme && <MapCompleteControl minZoomLevel={minZoomLevel} mapComplete_theme={sourcePreset?.mapcomplete_theme} position="top-left" />}

        <NavigationControl visualizePitch position="top-right" />
        <GeolocateControl positionOptions={{ enableHighAccuracy: true }} trackUserLocation={false} position="top-right" />
        <FullscreenControl position="top-right" />
        <LanguageControl position="top-right" />
        <IDEditorControl minZoomLevel={minZoomLevel} position="top-right" />
        <OsmWikidataMatcherControl minZoomLevel={minZoomLevel} position="top-right" />
        <QueryLinkControl iconURL="/img/Overpass-turbo.svg" title={t("overpass_turbo_query", "Source OverpassQL query on Overpass Turbo")} sourceIDs={[ELEMENTS_SOURCE, DETAILS_SOURCE]} mapEventField="overpass_query" baseURL="https://overpass-turbo.eu/?Q=" minZoomLevel={minZoomLevel} position="top-right" />
        <QueryLinkControl iconURL="/img/Wikidata_Query_Service_Favicon.svg" title={t("wdqs_query", "Source SPARQL query on Wikidata Query Service")} sourceIDs={[ELEMENTS_SOURCE, DETAILS_SOURCE]} mapEventField="wdqs_query" baseURL="https://query.wikidata.org/#" minZoomLevel={minZoomLevel} position="top-right" />
        {parseBoolConfig(process.env.owmf_qlever_enable) && <QueryLinkControl iconURL="/img/qlever.ico" title={t("qlever_query", "Source SPARQL query on QLever UI")} sourceIDs={[ELEMENTS_SOURCE, DETAILS_SOURCE]} mapEventField="qlever_wd_query" baseURL="https://qlever.cs.uni-freiburg.de/wikidata/?query=" minZoomLevel={minZoomLevel} position="top-right" />}
        {parseBoolConfig(process.env.owmf_qlever_enable) && <QueryLinkControl iconURL="/img/qlever.ico" title={t("qlever_query", "Source SPARQL query on QLever UI")} sourceIDs={[ELEMENTS_SOURCE, DETAILS_SOURCE]} mapEventField="qlever_osm_query" baseURL="https://qlever.cs.uni-freiburg.de/osm-planet/?query=" minZoomLevel={minZoomLevel} position="top-right" />}

        <ScaleControl position="bottom-right" />

        {elementsData && <ClusteredSourceAndLayers sourceID={ELEMENTS_SOURCE} data={elementsData} minZoom={minZoomLevel} maxZoom={thresholdZoomLevel} />}
        {detailsData && <GeoJsonSourceAndLayers sourceID={DETAILS_SOURCE} data={detailsData} minZoom={thresholdZoomLevel} setOpenFeature={setOpenFeature} color={colorScheme.color ?? '#0000ff'} />}
        {enablePMTiles && <PMTilesSourceAndLayers sourceID={PMTILES_SOURCE} pmtilesBaseURL={process.env.owmf_pmtiles_base_url!} pmtilesFileName="etymology_map.pmtiles" keyID={pmtilesKeyID} setOpenFeature={setOpenFeature} color={colorScheme.color ?? '#0000ff'} />}
    </Map>;
}
