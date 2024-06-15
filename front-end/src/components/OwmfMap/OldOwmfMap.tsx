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
import { SourcePresetControl } from '@/src/controls/SourcePresetControl';
import { SourcePreset } from '@/src/model/SourcePreset';
import { CombinedCachedMapService } from '@/src/services/CombinedCachedMapService';
import { ExpressionSpecification, Map, setRTLTextPlugin } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect } from 'react';
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

  return (
    <div className={styles["map-wrap"]}>
      <div ref={mapContainer} className={styles.map} />
    </div>
  );
}

function initBaseControls(map: Map) {

  map.addControl(new InfoControl(), 'top-left');

  map.addControl(new LanguageControl(), 'top-right');

  map.addControl(new DataTableControl(
    DETAILS_SOURCE,
    [DETAILS_SOURCE + POINT_LAYER, DETAILS_SOURCE + LINE_LAYER, DETAILS_SOURCE + POLYGON_FILL_LAYER]
  ), 'top-right');
}
