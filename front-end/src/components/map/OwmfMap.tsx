"use client";
import { fetchSourcePreset } from "@/src/SourcePreset/client";
import { IDEditorControl } from "@/src/components/controls/IDEditorControl";
import { MapCompleteControl } from "@/src/components/controls/MapCompleteControl";
import { OwmfGeocodingControl } from "@/src/components/controls/OwmfGeocodingControl";
import { useBackgroundStyleContext } from "@/src/context/BackgroundStyleContext";
import { useLoadingSpinnerContext } from "@/src/context/LoadingSpinnerContext";
import { useSnackbarContext } from "@/src/context/SnackbarContext";
import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import { OwmfFeature } from "@/src/model/OwmfResponse";
import { SourcePreset } from "@/src/model/SourcePreset";
import { CombinedCachedMapService } from "@/src/services/CombinedCachedMapService";
import { MapService } from "@/src/services/MapService";
import {
  DataDrivenPropertyValueSpecification,
  LngLatBoundsLike,
  RequestTransformFunction,
  addProtocol,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { isMapboxURL, transformMapboxUrl } from "maplibregl-mapbox-request-transformer";
import { Protocol } from "pmtiles";
import { CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Map, {
  ErrorEvent,
  FullscreenControl,
  GeolocateControl,
  MapEvent,
  MapSourceDataEvent,
  NavigationControl,
  ScaleControl,
  ViewStateChangeEvent
} from "react-map-gl/maplibre";
import { BackEndControl } from "../controls/BackEndControl/BackEndControl";
import { BackgroundStyleControl } from "../controls/BackgroundStyleControl";
import { DataTableControl } from "../controls/DataTableControl";
import { InfoControl } from "../controls/InfoControl";
import { InspectControl } from "../controls/InspectControl";
import { LanguageControl } from "../controls/LanguageControl";
import { OsmWikidataMatcherControl } from "../controls/OsmWikidataMatcherControl";
import { ProjectionControl } from "../controls/ProjectionControl";
import { QueryLinkControls } from "../controls/QueryLinkControls/QueryLinkControls";
import { SourcePresetControl } from "../controls/SourcePresetControl";
import { StatisticsColorControl } from "../controls/StatisticsColorControl/StatisticsColorControl";
import { FeaturePopup } from "../popup/FeaturePopup";
import { ClusteredSourceAndLayers } from "./ClusteredSourceAndLayers";
import { DetailsLayers } from "./DetailsLayers";
import { DetailsSourceAndLayers } from "./DetailsSourceAndLayers";
import { PMTilesSource } from "./PMTilesSource";

const PMTILES_PREFIX = "pmtiles",
  MAX_ZOOM = 19,
  BOUNDS: LngLatBoundsLike | undefined =
    process.env.NEXT_PUBLIC_OWMF_min_lon &&
      process.env.NEXT_PUBLIC_OWMF_min_lat &&
      process.env.NEXT_PUBLIC_OWMF_max_lon &&
      process.env.NEXT_PUBLIC_OWMF_max_lat ? [
      parseFloat(process.env.NEXT_PUBLIC_OWMF_min_lon),
      parseFloat(process.env.NEXT_PUBLIC_OWMF_min_lat),
      parseFloat(process.env.NEXT_PUBLIC_OWMF_max_lon),
      parseFloat(process.env.NEXT_PUBLIC_OWMF_max_lat),
    ] : undefined,
  FALLBACK_COLOR = "#3bb2d0",
  POINT_LAYER = "layer_point",
  POINT_TAP_AREA_LAYER = "layer_point_tapArea",
  LINE_LAYER = "layer_lineString_line",
  LINE_TAP_AREA_LAYER = "layer_lineString_tapArea",
  POLYGON_BORDER_LAYER = "layer_polygon_border",
  POLYGON_FILL_LAYER = "layer_polygon_fill",
  PMTILES_SOURCE = "pmtiles_source",
  PMTILES_LAYER_NAME = "detail", // If you need to change this, remember to change also the corresponding pipeline constant (in OwmfDbInitDAG.py)
  DETAILS_SOURCE = "detail_source",
  ELEMENTS_SOURCE = "elements_source";

export const OwmfMap = () => {
  const { t } = useTranslation(),
    { lon, setLon, lat, setLat, zoom, setZoom, backEndID, sourcePresetID } =
      useUrlFragmentContext(),
    [mapLon, setMapLon] = useState<number>(),
    [mapLat, setMapLat] = useState<number>(),
    [mapZoom, setMapZoom] = useState<number>(),
    [fetchedSourcePreset, setFetchedSourcePreset] = useState<SourcePreset>(),
    [sourcePreset, setSourcePreset] = useState<SourcePreset>(),
    sourcePresetIsReady = sourcePreset?.id === sourcePresetID,
    [backEndService, setBackEndService] = useState<MapService | null>(null),
    [openFeature, setOpenFeature] = useState<OwmfFeature | undefined>(undefined),
    { style, backgroundStyle } = useBackgroundStyleContext(),
    [layerColor, setLayerColor] =
      useState<DataDrivenPropertyValueSpecification<string>>(FALLBACK_COLOR),
    minZoomLevel = useMemo(
      () =>
        sourcePreset?.use_min_zoom_level
          ? parseInt(process.env.NEXT_PUBLIC_OWMF_min_zoom_level ?? "9")
          : 1,
      [sourcePreset?.use_min_zoom_level]
    ),
    { showSnackbar } = useSnackbarContext(),
    { showLoadingSpinner } = useLoadingSpinnerContext(),
    thresholdZoomLevel = useMemo(
      () => parseInt(process.env.NEXT_PUBLIC_OWMF_threshold_zoom_level ?? "14"),
      []
    ),
    [pmtilesReady, setPMTilesReady] = useState(false),
    inlineStyle = useMemo<CSSProperties | undefined>(() => {
      const backgroundColor = (
        process.env.NEXT_PUBLIC_OWMF_use_background_color === "true" ? sourcePreset?.background_color : null
      ) ?? "#ffffff";
      return {
        backgroundColor: backgroundColor,
        "--owmf-background-color": backgroundColor,
        "--owmf-popup-width": "min(30em,90vw)",
        "--owmf-cell-width": "min(25em,75vw)",
      };
    },
      [sourcePreset?.background_color]
    ),
    pmtilesActive =
      pmtilesReady &&
      !!process.env.NEXT_PUBLIC_OWMF_pmtiles_base_url &&
      process.env.NEXT_PUBLIC_OWMF_pmtiles_preset === sourcePresetID &&
      backEndID.startsWith(PMTILES_PREFIX),
    clustersActive =
      !pmtilesActive &&
      !!backEndService &&
      zoom >= minZoomLevel &&
      zoom < thresholdZoomLevel,
    detailsActive = !pmtilesActive && !!backEndService && zoom >= thresholdZoomLevel,
    pmtilesKeyID =
      backEndID === "pmtiles_all" ? undefined : backEndID.replace("pmtiles_", ""),
    dataLayerIDs = useMemo(() => [POINT_LAYER, LINE_LAYER, POLYGON_BORDER_LAYER], []),
    geoJsonSourceIDs = useMemo(() => [ELEMENTS_SOURCE, DETAILS_SOURCE], []),
    allSourceIDs = useMemo(() => [PMTILES_SOURCE, ELEMENTS_SOURCE, DETAILS_SOURCE], []);

  const onMoveHandler = useCallback((e: ViewStateChangeEvent) => {
    setMapLon(e.viewState.longitude);
    setMapLat(e.viewState.latitude);
    setMapZoom(e.viewState.zoom);
  }, []);

  useEffect(() => {
    setMapLat(lat);
    setMapLon(lon);
    setMapZoom(zoom);
  }, [lat, lon, zoom]);

  const mapIdleHandler = useCallback(
    (e: MapEvent) => {
      const center = e.target.getCenter();
      console.debug("mapIdleHandler", center);
      setLon(center.lng);
      setLat(center.lat);
      setZoom(e.target.getZoom());
    },
    [setLat, setLon, setZoom]
  );

  const requestTransformFunction: RequestTransformFunction = useCallback(
    (url, resourceType) => {
      if (process.env.NEXT_PUBLIC_OWMF_mapbox_token && isMapboxURL(url)) {
        return transformMapboxUrl(
          url,
          resourceType as string,
          process.env.NEXT_PUBLIC_OWMF_mapbox_token
        );
      }

      if (url.includes("localhost")) url = url.replace("http", "https");

      return { url };
    },
    []
  );

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_OWMF_pmtiles_base_url) {
      const pmtilesProtocol = new Protocol();
      addProtocol("pmtiles", pmtilesProtocol.tile);
      setPMTilesReady(true);
    }
  }, []);

  useEffect(() => {
    if (!pmtilesActive && !clustersActive && !detailsActive) {
      showLoadingSpinner(false);
      if (backEndService) {
        // A back-end service is active => Not using pmtiles
        // No layers are active => The user is zoomed out too far
        showSnackbar(t("snackbar.zoom_in"), "wheat", 15_000);
      }
    }
  }, [
    backEndService,
    clustersActive,
    detailsActive,
    pmtilesActive,
    showLoadingSpinner,
    showSnackbar,
    t,
  ]);

  useEffect(() => {
    if (sourcePresetIsReady) {
      console.log("Skipping redundant source preset fetch", {
        new: sourcePresetID,
        old: sourcePreset?.id,
      });
      return;
    }

    console.debug("Fetching source preset", {
      new: sourcePresetID,
      old: sourcePreset?.id,
    });
    fetchSourcePreset(sourcePresetID)
      .then(setFetchedSourcePreset)
      .catch((e) => {
        //setBackEndService(null);
        //setSourcePreset(null);
        console.error("Failed updating source preset", e);
        showSnackbar(t("snackbar.map_error"));
      });
  }, [showSnackbar, sourcePreset?.id, sourcePresetID, sourcePresetIsReady, t]);

  // The intermediate variable fetchedSourcePreset is needed to prevent setting the wrong sourcePreset when different presets are fetched in very close succession
  useEffect(() => {
    if (!fetchedSourcePreset) return;

    if (fetchedSourcePreset.id !== sourcePresetID) {
      console.warn("Not setting wrong source preset", {
        sourcePresetID,
        new: fetchedSourcePreset.id,
      });
      return;
    }

    setSourcePreset((oldPreset) => {
      if (oldPreset?.id === fetchedSourcePreset?.id) {
        console.log("Skipping redundant source preset update", {
          old: oldPreset?.id,
          new: fetchedSourcePreset.id,
        });
        return oldPreset;
      }

      console.debug("Updating source preset", {
        old: oldPreset?.id,
        new: fetchedSourcePreset.id,
      });
      setBackEndService(new CombinedCachedMapService(fetchedSourcePreset));
      return fetchedSourcePreset;
    });
  }, [fetchedSourcePreset, sourcePresetID]);

  /**
   * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:error
   */
  const mapErrorHandler = useCallback(
    (err: ErrorEvent & { sourceId?: string, style?: unknown }) => {
      if (err.sourceId && allSourceIDs.includes(err.sourceId)) {
        console.warn("An error occurred while fetching a map source", err);
        showSnackbar(t("snackbar.fetch_error", "An error occurred while fetching the data"));
      } else if (err.style && err.error) {
        console.warn("An error occurred while rendering the map", err.error.message, err);
        showSnackbar(t("snackbar.map_error"));
      } else {
        console.error("Generic map error", err);
        showSnackbar(t("snackbar.map_error"));
      }
    },
    [allSourceIDs, showSnackbar, t]
  );

  const closeFeaturePopup = useCallback(() => setOpenFeature(undefined), []);

  /**
   * Event listener that fires when one of the map's sources loads or changes.
   *
   * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:sourcedata
   * @see https://docs.mapbox.com/mapbox-gl-js/api/events/#mapdataevent
   */
  const mapSourceDataHandler = useCallback(
    (e: MapSourceDataEvent) => {
      if (!e.isSourceLoaded || e.dataType !== "source") return;

      const detailsSourceEvent = e.sourceId === DETAILS_SOURCE,
        elementsSourceEvent = e.sourceId === ELEMENTS_SOURCE;

      if (detailsSourceEvent || elementsSourceEvent) {
        console.debug("mapSourceDataHandler: data loaded", {
          detailsSourceEvent,
          elementsSourceEvent,
          e,
          source: e.sourceId,
        });

        const noFeatures =
          detailsSourceEvent &&
          e.source.type === "geojson" && // Vector tile sources don't support querySourceFeatures()
          e.target.querySourceFeatures(DETAILS_SOURCE).length === 0;

        if (noFeatures)
          showSnackbar(
            t("snackbar.no_data_in_this_area", "No data in this area"),
            "wheat",
            3000
          );
        else if (detailsSourceEvent)
          showSnackbar(
            t(
              "snackbar.data_loaded_instructions",
              "Data loaded, click on any highlighted element to show its details"
            ),
            "lightgreen",
            10000
          );
        // showLoadingSpinner(false); // Better handled by its own useEffect
      }
    },
    [showSnackbar, t]
  );

  return mapLat !== undefined && mapLon !== undefined && mapZoom && (
    <Map
      mapLib={import("maplibre-gl")}
      RTLTextPlugin="https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js"
      mapStyle={backgroundStyle}
      style={inlineStyle}
      latitude={mapLat}
      longitude={mapLon}
      zoom={mapZoom}
      maxBounds={BOUNDS}
      maxZoom={MAX_ZOOM}
      onMove={onMoveHandler}
      transformRequest={requestTransformFunction}
      onSourceData={mapSourceDataHandler}
      onError={mapErrorHandler}
      onIdle={mapIdleHandler}
    >
      <InfoControl position="top-left" />
      <SourcePresetControl position="top-left" />
      {sourcePresetIsReady && (
        <BackEndControl preset={sourcePreset} position="top-left" />
      )}
      {sourcePresetIsReady && sourcePreset?.mapcomplete_theme && (
        <MapCompleteControl
          minZoomLevel={minZoomLevel}
          mapComplete_theme={sourcePreset?.mapcomplete_theme}
          position="top-left"
        />
      )}
      {sourcePresetIsReady && (
        <StatisticsColorControl
          preset={sourcePreset}
          layerIDs={dataLayerIDs}
          sourceIDs={allSourceIDs}
          setLayerColor={setLayerColor}
          position="top-left"
        />
      )}

      <NavigationControl visualizePitch position="top-right" style={inlineStyle} />
      <GeolocateControl
        positionOptions={{ enableHighAccuracy: true }}
        style={inlineStyle}
        trackUserLocation={false}
        position="top-right"
      />
      <FullscreenControl position="top-right" style={inlineStyle} />
      <BackgroundStyleControl position="top-right" />
      {process.env.NEXT_PUBLIC_OWMF_enable_projection_control === "true" && <ProjectionControl position="top-right" />}
      <LanguageControl position="top-right" />
      <IDEditorControl minZoomLevel={thresholdZoomLevel} position="top-right" />
      <OsmWikidataMatcherControl minZoomLevel={thresholdZoomLevel} position="top-right" />
      <DataTableControl
        sourceID={pmtilesActive ? PMTILES_SOURCE : DETAILS_SOURCE}
        dataLayerIDs={dataLayerIDs}
        minZoomLevel={pmtilesActive ? undefined : thresholdZoomLevel}
        position="top-right"
        setOpenFeature={setOpenFeature}
      />
      <QueryLinkControls
        sourceIDs={geoJsonSourceIDs}
        minZoomLevel={minZoomLevel}
        position="top-right"
      />

      {process.env.NEXT_PUBLIC_OWMF_maptiler_key && <OwmfGeocodingControl position="bottom-left" />}

      <ScaleControl position="bottom-right" />
      {process.env.NODE_ENV === "development" && <InspectControl position="bottom-right" />}

      {clustersActive && (
        <ClusteredSourceAndLayers
          backEndService={backEndService}
          sourceID={ELEMENTS_SOURCE}
          minZoom={minZoomLevel}
          maxZoom={thresholdZoomLevel}
          useLinkedEntityCount={sourcePreset?.use_linked_entity_count}
          customFonts={style?.customFonts}
        />
      )}
      {detailsActive && (
        <DetailsSourceAndLayers
          backEndService={backEndService}
          sourceID={DETAILS_SOURCE}
          minZoom={thresholdZoomLevel}
          setOpenFeature={setOpenFeature}
          color={layerColor}
          pointLayerID={POINT_LAYER}
          pointTapAreaLayerID={POINT_TAP_AREA_LAYER}
          lineLayerID={LINE_LAYER}
          lineTapAreaLayerID={LINE_TAP_AREA_LAYER}
          polygonBorderLayerID={POLYGON_BORDER_LAYER}
          polygonFillLayerID={POLYGON_FILL_LAYER}
        />
      )}
      {pmtilesActive && (
        <PMTilesSource id={PMTILES_SOURCE}>
          <DetailsLayers
            sourceID={PMTILES_SOURCE}
            keyID={pmtilesKeyID}
            source_layer={PMTILES_LAYER_NAME}
            setOpenFeature={setOpenFeature}
            color={layerColor}
            pointLayerID={POINT_LAYER}
            pointTapAreaLayerID={POINT_TAP_AREA_LAYER}
            lineLayerID={LINE_LAYER}
            lineTapAreaLayerID={LINE_TAP_AREA_LAYER}
            polygonBorderLayerID={POLYGON_BORDER_LAYER}
            polygonFillLayerID={POLYGON_FILL_LAYER}
          />
        </PMTilesSource>
      )}

      {openFeature && sourcePresetIsReady && <FeaturePopup feature={openFeature} preset={sourcePreset} onClose={closeFeaturePopup} />}
    </Map>
  );
};
