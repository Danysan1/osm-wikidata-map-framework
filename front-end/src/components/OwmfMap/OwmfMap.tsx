"use client";
import { parseBoolConfig } from '@/src/config';
import { BackEndControl } from '@/src/controls/BackEndControl';
import { BackgroundStyleControl } from '@/src/controls/BackgroundStyleControl';
import { DataTableControl } from '@/src/controls/DataTableControl';
import { EtymologyColorControl } from '@/src/controls/EtymologyColorControl';
import { InfoControl } from '@/src/controls/InfoControl';
import { LanguageControl } from '@/src/controls/LanguageControl';
import { LinkControl } from '@/src/controls/LinkControl';
import { MapCompleteControl } from '@/src/controls/MapCompleteControl';
import { OsmWikidataMatcherControl } from '@/src/controls/OsmWikidataMatcherControl';
import { SourcePresetControl } from '@/src/controls/SourcePresetControl';
import { iDEditorControl } from '@/src/controls/iDEditorControl';
import { useUrlFragment } from '@/src/hooks/useUrlFragment';
import { SourcePreset } from '@/src/model/SourcePreset';
import { BackgroundStyle, jawgStyle, mapboxStyle, maptilerStyle, stadiaStyle } from '@/src/model/backgroundStyle';
import { CombinedCachedMapService } from '@/src/services/CombinedCachedMapService';
import { MapService } from '@/src/services/MapService';
import { fetchSourcePreset } from '@/src/services/PresetService';
import { showSnackbar } from '@/src/snackbar';
import { ExpressionSpecification, FullscreenControl, GeolocateControl, Map, NavigationControl, ScaleControl, setRTLTextPlugin } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTranslation } from 'next-i18next';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import styles from "./OwmfMap.module.css";

const PMTILES_PREFIX = "pmtiles",
  DETAILS_SOURCE = "detail_source",
  POINT_LAYER = '_layer_point',
  POINT_TAP_AREA_LAYER = '_layer_point_tapArea',
  LINE_LAYER = '_layer_lineString_line',
  LINE_TAP_AREA_LAYER = '_layer_lineString_tapArea',
  POLYGON_BORDER_LAYER = '_layer_polygon_border',
  POLYGON_FILL_LAYER = '_layer_polygon_fill',
  ELEMENTS_SOURCE = "elements_source",
  CLUSTER_LAYER = '_layer_cluster',
  COUNT_LAYER = '_layer_count',
  POLYGON_BORDER_LOW_ZOOM_WIDTH = 2,
  POLYGON_BORDER_HIGH_ZOOM_WIDTH = 6,
  COUNTRY_MAX_ZOOM = 5,
  COUNTRY_ADMIN_LEVEL = 2,
  STATE_MAX_ZOOM = 7,
  STATE_ADMIN_LEVEL = 4,
  PROVINCE_MAX_ZOOM = 9,
  PROVINCE_ADMIN_LEVEL = 6;

export default function OwmfMap() {
  const mapContainer = useRef<HTMLDivElement | null>(null),
    map = useRef<Map | null>(null),
    { lon, setLon, lat, setLat, zoom, setZoom, colorScheme, setColorScheme, backEndID, setBackEndID, backgroundStyleID, setBackgroundStyleID, sourcePresetID, setSourcePresetID } = useUrlFragment(),
    [sourcePreset, setSourcePreset] = useState<SourcePreset | null>(null),
    [backEndService, setBackEndService] = useState<MapService | null>(null),
    [backEndControl, setBackEndControl] = useState<BackEndControl | null>(null),
    [colorControl, setColorControl] = useState<EtymologyColorControl | null>(null),
    [mapcompleteControl, setMapcompleteControl] = useState<MapCompleteControl | null>(null),
    backgroundStyles = useMemo(() => getBacgkroundStyles(), []),
    backgroundStyle = useMemo(() => backgroundStyles.find(style => style.id === backgroundStyleID), [backgroundStyles, backgroundStyleID]),
    { t } = useTranslation();

  // https://nextjs.org/docs/app/api-reference/functions/generate-metadata#resource-hints
  if (process.env.owmf_default_language) ReactDOM.preload(`locales/${process.env.owmf_default_language}/common.json`, { as: "fetch", crossOrigin: "anonymous" });
  if (process.env.owmf_pmtiles_base_url) ReactDOM.preload(`${process.env.owmf_pmtiles_base_url}/date.txt`, { as: "fetch", crossOrigin: "anonymous" });
  if (process.env.owmf_default_background_style === "stadia_alidade") ReactDOM.preload("https://tiles.stadiamaps.com/styles/alidade_smooth.json", { as: "fetch", crossOrigin: "anonymous" });
  if (process.env.owmf_default_background_style?.startsWith("stadia_")) ReactDOM.preload("https://tiles.stadiamaps.com/data/openmaptiles.json", { as: "fetch", crossOrigin: "anonymous" });
  if (process.env.owmf_default_background_sty === "stamen_toner_lite") ReactDOM.preload("https://tiles.stadiamaps.com/styles/stamen_toner_lite.json", { as: "fetch", crossOrigin: "anonymous" });
  if (process.env.owmf_default_background_style === "stamen_toner") ReactDOM.preload("https://tiles.stadiamaps.com/styles/stamen_toner.json", { as: "fetch", crossOrigin: "anonymous" });
  if (process.env.owmf_default_background_style?.startsWith("stamen_")) ReactDOM.preload("https://tiles.stadiamaps.com/data/stamen-omt.json", { as: "fetch", crossOrigin: "anonymous" });

  /* Initialize the map */
  useEffect(() => {
    if (!mapContainer.current || map.current) return; // stops map from intializing more than once

    const initialBackgroundStyle = backgroundStyle ?? backgroundStyles[0];
    if (backgroundStyle !== initialBackgroundStyle) {
      console.warn("Empty default background style, using the first available", { backgroundStyle, backgroundStyles, initialBackgroundStyle });
      setBackgroundStyleID(initialBackgroundStyle.id);
    }

    if (process.env.NODE_ENV === 'development') console.debug("Initializing map", { lon, lat, zoom, initialBackgroundStyle, backgroundStyles });
    map.current = new Map({
      container: mapContainer.current,
      style: initialBackgroundStyle.styleUrl,
      center: [lon, lat],
      zoom: zoom
    });

    map.current.addControl(new BackgroundStyleControl(backgroundStyles, initialBackgroundStyle.id, setBackgroundStyleID), 'top-right');

    initBaseControls(map.current);

    const minZoomLevel = parseInt(process.env.owmf_min_zoom_level ?? "9");
    if (process.env.NODE_ENV === 'development') console.debug("Initializing source & color controls", { minZoomLevel });

    try {
      const presetControl = new SourcePresetControl(sourcePresetID, setSourcePresetID, t);
      map.current.addControl(presetControl, 'top-left');
    } catch (e) {
      console.error(e);
    }

    /* Set up controls in the top RIGHT corner */
    map.current.addControl(new LinkControl(
      "img/Overpass-turbo.svg",
      t("overpass_turbo_query", "Source OverpassQL query on Overpass Turbo"),
      [ELEMENTS_SOURCE, DETAILS_SOURCE],
      "overpass_query",
      "https://overpass-turbo.eu/?Q=",
      minZoomLevel
    ), 'top-right');

    map.current.addControl(new LinkControl(
      "img/Wikidata_Query_Service_Favicon.svg",
      t("wdqs_query", "Source SPARQL query on Wikidata Query Service"),
      [ELEMENTS_SOURCE, DETAILS_SOURCE],
      "wdqs_query",
      "https://query.wikidata.org/#",
      minZoomLevel
    ), 'top-right');

    if (parseBoolConfig(process.env.owmf_qlever_enable)) {
      map.current.addControl(new LinkControl(
        "img/qlever.ico",
        t("qlever_query", "Source SPARQL query on QLever UI"),
        [ELEMENTS_SOURCE, DETAILS_SOURCE],
        "qlever_wd_query",
        "https://qlever.cs.uni-freiburg.de/wikidata/?query=",
        minZoomLevel
      ), 'top-right');

      map.current.addControl(new LinkControl(
        "img/qlever.ico",
        t("qlever_query", "Source SPARQL query on QLever UI"),
        [ELEMENTS_SOURCE, DETAILS_SOURCE],
        "qlever_osm_query",
        "https://qlever.cs.uni-freiburg.de/osm-planet/?query=",
        minZoomLevel
      ), 'top-right');
    }

    // https://maplibre.org/maplibre-gl-js-docs/example/mapbox-gl-rtl-text/
    setRTLTextPlugin(
      'https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js',
      true // Lazy load the plugin
    ).then(() => {
      if (process.env.NODE_ENV === 'development') console.debug("mapbox-gl-rtl-text loaded");
    }).catch(
      err => console.error("Error loading mapbox-gl-rtl-text", err)
    );
  }, [backgroundStyle, lon, lat, zoom, backgroundStyles, setBackgroundStyleID, t, sourcePresetID, setSourcePresetID, map]);

  useEffect(() => {
    if (!map.current || !backgroundStyle) return;
    if (process.env.NODE_ENV === 'development') console.debug("Updating the map background style upon style change", { backgroundStyle });
    map.current.setStyle(backgroundStyle.styleUrl);
  }, [backgroundStyle, map]);

  const updatePresetDependantControls = useCallback((preset: SourcePreset) => {
    console.debug("updatePresetDependantControls: updating", preset);
    setBackEndService(new CombinedCachedMapService(preset));

    const newBackEndControl: BackEndControl = new BackEndControl(
      preset, backEndID, setBackEndID, t
    );
    setBackEndControl(oldControl => {
      if (!map.current || oldControl === newBackEndControl) return oldControl;
      if (oldControl) map.current?.removeControl(oldControl);
      map.current.addControl(newBackEndControl, 'top-left');
      return newBackEndControl;
    });

    const thresholdZoomLevel = parseInt(process.env.owmf_threshold_zoom_level ?? "14"),
      setLayerColor = (color: string | ExpressionSpecification) => {
        if (process.env.NODE_ENV === 'development') console.debug("initWikidataControls set layer color", { color });
        [
          [DETAILS_SOURCE + POINT_LAYER, "circle-color"],
          [DETAILS_SOURCE + LINE_LAYER, 'line-color'],
          [DETAILS_SOURCE + POLYGON_FILL_LAYER, 'fill-extrusion-color'],
          [DETAILS_SOURCE + POLYGON_BORDER_LAYER, 'line-color'],
        ].forEach(([layerID, property]) => {
          if (map.current?.getLayer(layerID)) {
            map.current.setPaintProperty(layerID, property, color);
          } else {
            console.warn("Layer does not exist, can't set property", { layerID, property, color });
          }
        });
      },
      newColorControl = new EtymologyColorControl(
        preset,
        colorScheme,
        setColorScheme,
        setLayerColor,
        t,
        DETAILS_SOURCE,
        [DETAILS_SOURCE + POINT_LAYER, DETAILS_SOURCE + LINE_LAYER, DETAILS_SOURCE + POLYGON_BORDER_LAYER]
      );
    setColorControl(oldControl => {
      if (!map.current || oldControl === newColorControl) return oldControl;
      if (oldControl) map.current?.removeControl(oldControl);
      map.current.addControl(newColorControl, 'top-left');
      return newColorControl;
    });

    if (preset.mapcomplete_theme) {
      const newMapCompleteControl = new MapCompleteControl(preset.mapcomplete_theme, thresholdZoomLevel);
      setMapcompleteControl(oldControl => {
        if (!map.current || oldControl === newMapCompleteControl) return oldControl;
        if (oldControl) map.current?.removeControl(oldControl);
        map.current.addControl(newMapCompleteControl, 'top-left');
        return newMapCompleteControl;
      });
    }
  }, [backEndID, colorScheme, setBackEndID, setColorScheme, t]);

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
        updatePresetDependantControls(newPreset);
        if (process.env.NODE_ENV === 'development') console.debug("Source preset updated", { old: oldPreset?.id, new: newPreset.id });
        return newPreset;
      });
    }).catch(e => {
      //setBackEndService(null);
      //setSourcePreset(null);
      console.error("Failed updating source preset", e);
      showSnackbar(t("snackbar.map_error"));
    }).finally(() => {
      process.env.REACT_APP_FETCHING_PRESET = undefined;
    });
  }, [sourcePreset?.id, sourcePresetID, t, updatePresetDependantControls]);

  return (
    <div className={styles["map-wrap"]}>
      <div ref={mapContainer} className={styles.map} />
    </div>
  );
}

function getBacgkroundStyles() {
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

function initBaseControls(map: Map) {
  // https://docs.mapbox.com/mapbox-gl-js/api/markers/#navigationcontrol
  map.addControl(new NavigationControl({
    visualizePitch: true
  }), 'top-right');

  // https://docs.mapbox.com/mapbox-gl-js/example/locate-user/
  // Add geolocate control to the map.
  map.addControl(new GeolocateControl({
    positionOptions: {
      enableHighAccuracy: true
    },
    // When active the map will receive updates to the device's location as it changes.
    trackUserLocation: false,
    // Draw an arrow next to the location dot to indicate which direction the device is heading.
    //showUserHeading: true
  }), 'top-right');

  // https://docs.mapbox.com/mapbox-gl-js/api/markers/#scalecontrol
  map.addControl(new ScaleControl({
    maxWidth: 80,
    unit: 'metric'
  }), 'bottom-left');

  map.addControl(new FullscreenControl(), 'top-right');

  map.addControl(new InfoControl(), 'top-left');

  map.addControl(new LanguageControl(), 'top-right');

  map.addControl(new DataTableControl(
    DETAILS_SOURCE,
    [DETAILS_SOURCE + POINT_LAYER, DETAILS_SOURCE + LINE_LAYER, DETAILS_SOURCE + POLYGON_FILL_LAYER]
  ), 'top-right');


  const thresholdZoomLevel = parseInt(process.env.owmf_threshold_zoom_level ?? "14");
  map.addControl(new iDEditorControl(thresholdZoomLevel), 'top-right');
  map.addControl(new OsmWikidataMatcherControl(thresholdZoomLevel), 'top-right');


  /*if (process.env.NODE_ENV === 'development') {
      import("maplibre-gl-inspect").then(MaplibreInspect => {
          map.addControl(new MaplibreInspect({
              popup: new Popup({
                  closeButton: false,
                  closeOnClick: false
              })
          }), 'bottom-right');
      }).catch(e => console.error("Failed to load maplibre-gl-inspect", e));
  }*/
}
