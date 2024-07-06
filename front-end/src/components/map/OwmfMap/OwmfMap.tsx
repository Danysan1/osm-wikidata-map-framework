"use client";
import { IDEditorControl } from "@/src/components/controls/IDEditorControl";
import { MapCompleteControl } from "@/src/components/controls/MapCompleteControl";
import { OwmfGeocodingControl } from "@/src/components/controls/OwmfGeocodingControl";
import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import { EtymologyFeature } from "@/src/model/EtymologyResponse";
import { SourcePreset } from "@/src/model/SourcePreset";
import { CombinedCachedMapService } from "@/src/services/CombinedCachedMapService";
import { MapService } from "@/src/services/MapService";
import { fetchSourcePreset } from "@/src/services/PresetService";
import { showSnackbar } from "@/src/snackbar";
import {
  DataDrivenPropertyValueSpecification,
  RequestTransformFunction,
  addProtocol,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { isMapboxURL, transformMapboxUrl } from "maplibregl-mapbox-request-transformer";
import { Protocol } from "pmtiles";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Map, {
  FullscreenControl,
  GeolocateControl,
  MapStyle,
  NavigationControl,
  ScaleControl,
  ViewStateChangeEvent,
} from "react-map-gl/maplibre";
import { FeaturePopup } from "../../FeaturePopup/FeaturePopup";
import { BackEndControl } from "../../controls/BackEndControl";
import { BackgroundStyleControl } from "../../controls/BackgroundStyleControl";
import { DataTableControl } from "../../controls/DataTableControl/DataTableControl";
import { InfoControl } from "../../controls/InfoControl/InfoControl";
import { LanguageControl } from "../../controls/LanguageControl";
import { OsmWikidataMatcherControl } from "../../controls/OsmWikidataMatcherControl";
import { QLeverQueryLinkControls } from "../../controls/QLeverQueryLinkControl/QLeverQueryLinkControl";
import { QueryLinkControl } from "../../controls/QueryLinkControl";
import { SourcePresetControl } from "../../controls/SourcePresetControl";
import { StatisticsColorControl } from "../../controls/StatisticsColorControl";
import { ClusteredSourceAndLayers } from "../ClusteredSourceAndLayers";
import { DetailsLayers } from "../DetailsLayers";
import { DetailsSourceAndLayers } from "../DetailsSourceAndLayers";
import { PMTilesSource } from "../PMTilesSource";

const PMTILES_PREFIX = "pmtiles",
  FALLBACK_COLOR = "#3bb2d0",
  POINT_LAYER = "layer_point",
  POINT_TAP_AREA_LAYER = "layer_point_tapArea",
  LINE_LAYER = "layer_lineString_line",
  LINE_TAP_AREA_LAYER = "layer_lineString_tapArea",
  POLYGON_BORDER_LAYER = "layer_polygon_border",
  POLYGON_FILL_LAYER = "layer_polygon_fill",
  PMTILES_SOURCE = "pmtiles_source",
  DETAILS_SOURCE = "detail_source",
  ELEMENTS_SOURCE = "elements_source";

export const OwmfMap = () => {
  const { t } = useTranslation(),
    {
      lon, setLon, lat, setLat, zoom, setZoom, backEndID, sourcePresetID
    } = useUrlFragmentContext(),
    [mapLon, setMapLon] = useState(lon),
    [mapLat, setMapLat] = useState(lat),
    [mapZoom, setMapZoom] = useState(zoom),
    [sourcePreset, setSourcePreset] = useState<SourcePreset | null>(null),
    [backEndService, setBackEndService] = useState<MapService | null>(null),
    [openFeature, setOpenFeature] = useState<EtymologyFeature | undefined>(undefined),
    [backgroundStyle, setBackgroundStyle] = useState<string | MapStyle | undefined>(
      undefined
    ),
    [layerColor, setLayerColor] =
      useState<DataDrivenPropertyValueSpecification<string>>(FALLBACK_COLOR),
    minZoomLevel = useMemo(() => parseInt(process.env.owmf_min_zoom_level ?? "9"), []),
    thresholdZoomLevel = useMemo(
      () => parseInt(process.env.owmf_threshold_zoom_level ?? "14"),
      []
    ),
    [pmtilesReady, setPMTilesReady] = useState(false),
    pmtilesActive = useMemo(
      () =>
        !!process.env.owmf_pmtiles_base_url &&
        process.env.owmf_pmtiles_preset === sourcePresetID &&
        pmtilesReady &&
        backEndID.startsWith(PMTILES_PREFIX),
      [backEndID, pmtilesReady, sourcePresetID]
    ),
    pmtilesKeyID = useMemo(
      () => (backEndID === "pmtiles_all" ? undefined : backEndID.replace("pmtiles_", "")),
      [backEndID]
    ),
    dataLayerIDs = useMemo(() => [POINT_LAYER, LINE_LAYER, POLYGON_BORDER_LAYER], []);

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

  const onMoveEndHandler = useCallback(
    (e: ViewStateChangeEvent) => {
      setLon(e.viewState.longitude);
      setLat(e.viewState.latitude);
      setZoom(e.viewState.zoom);
    },
    [setLat, setLon, setZoom]
  );

  const requestTransformFunction: RequestTransformFunction = useCallback(
    (url, resourceType) => {
      if (process.env.owmf_mapbox_token && isMapboxURL(url))
        return transformMapboxUrl(
          url,
          resourceType as string,
          process.env.owmf_mapbox_token
        );

      if (/^http:\/\/[^/]+(?<!localhost)\/(elements|etymology_map)\//.test(url))
        return { url: url.replace("http", "https") };

      return { url };
    },
    []
  );

  useEffect(() => {
    if (process.env.owmf_pmtiles_base_url) {
      const pmtilesProtocol = new Protocol();
      addProtocol("pmtiles", pmtilesProtocol.tile);
      setPMTilesReady(true);
    }
  }, []);

  useEffect(() => {
    if (sourcePreset?.id === sourcePresetID) {
      if (process.env.NODE_ENV === "development") console.warn(
        "Skipping redundant source preset fetch",
        { new: sourcePresetID, old: sourcePreset?.id }
      );
      return;
    }

    if (process.env.NODE_ENV === "development") console.debug(
      "Fetching source preset",
      { new: sourcePresetID, old: sourcePreset?.id }
    );
    fetchSourcePreset(sourcePresetID)
      .then((newPreset) => {
        setSourcePreset((oldPreset) => {
          if (oldPreset?.id === newPreset.id) {
            if (process.env.NODE_ENV === "development") console.warn(
              "Skipping redundant source preset update",
              { old: oldPreset?.id, new: newPreset.id }
            );
            return oldPreset;
          }

          if (process.env.NODE_ENV === "development") console.debug(
            "Updating source preset",
            { old: oldPreset?.id, new: newPreset.id }
          );
          setBackEndService(new CombinedCachedMapService(newPreset));
          return newPreset;
        });
      })
      .catch((e) => {
        //setBackEndService(null);
        //setSourcePreset(null);
        console.error("Failed updating source preset", e);
        showSnackbar("snackbar.map_error");
      });
  }, [sourcePreset?.id, sourcePresetID]);

  const closeFeaturePopup = useCallback(() => setOpenFeature(undefined), []);

  return (
    <Map
      mapLib={import("maplibre-gl")}
      RTLTextPlugin="https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js"
      mapStyle={backgroundStyle}
      latitude={mapLat}
      longitude={mapLon}
      zoom={mapZoom}
      onMove={onMoveHandler}
      onMoveEnd={onMoveEndHandler}
      transformRequest={requestTransformFunction}
    >
      <InfoControl position="top-left" />
      <SourcePresetControl position="top-left" />
      {sourcePreset && <BackEndControl preset={sourcePreset} position="top-left" />}
      {sourcePreset?.mapcomplete_theme && (
        <MapCompleteControl
          minZoomLevel={minZoomLevel}
          mapComplete_theme={sourcePreset?.mapcomplete_theme}
          position="top-left"
        />
      )}
      {sourcePreset && (
        <StatisticsColorControl
          preset={sourcePreset}
          sourceId={DETAILS_SOURCE}
          layerIDs={dataLayerIDs}
          setLayerColor={setLayerColor}
          position="top-left"
        />
      )}

      <NavigationControl visualizePitch position="top-right" />
      <GeolocateControl
        positionOptions={{ enableHighAccuracy: true }}
        trackUserLocation={false}
        position="top-right"
      />
      <FullscreenControl position="top-right" />
      <BackgroundStyleControl
        setBackgroundStyle={setBackgroundStyle}
        position="top-right"
      />
      <LanguageControl position="top-right" />
      <IDEditorControl minZoomLevel={minZoomLevel} position="top-right" />
      <OsmWikidataMatcherControl minZoomLevel={minZoomLevel} position="top-right" />
      <DataTableControl
        sourceID={pmtilesActive ? PMTILES_SOURCE : DETAILS_SOURCE}
        dataLayerIDs={dataLayerIDs}
        minZoomLevel={pmtilesActive ? undefined : thresholdZoomLevel}
        position="top-right"
        setOpenFeature={setOpenFeature}
      />
      <QueryLinkControl
        icon="/img/Overpass-turbo.svg"
        title={t("overpass_turbo_query", "Source OverpassQL query on Overpass Turbo")}
        sourceIDs={[ELEMENTS_SOURCE, DETAILS_SOURCE]}
        mapEventField="overpass_query"
        baseURL="https://overpass-turbo.eu/?Q="
        minZoomLevel={minZoomLevel}
        position="top-right"
      />
      <QueryLinkControl
        icon="/img/Wikidata_Query_Service_Favicon.svg"
        title={t("wdqs_query", "Source SPARQL query on Wikidata Query Service")}
        sourceIDs={[ELEMENTS_SOURCE, DETAILS_SOURCE]}
        mapEventField="wdqs_query"
        baseURL="https://query.wikidata.org/#"
        minZoomLevel={minZoomLevel}
        position="top-right"
      />
      <QLeverQueryLinkControls
        sourceIDs={[ELEMENTS_SOURCE, DETAILS_SOURCE]}
        minZoomLevel={minZoomLevel}
        position="top-right"
      />

      <OwmfGeocodingControl position="bottom-left" />

      <ScaleControl position="bottom-right" />
      {/*process.env.NODE_ENV === "development" && <InspectControl position="bottom-right" />*/}

      {!pmtilesActive &&
        backEndService &&
        zoom >= minZoomLevel &&
        zoom < thresholdZoomLevel && (
          <ClusteredSourceAndLayers
            backEndService={backEndService}
            backEndID={backEndID}
            sourceID={ELEMENTS_SOURCE}
            minZoom={minZoomLevel}
            maxZoom={thresholdZoomLevel}
          />
        )}
      {!pmtilesActive && backEndService && zoom >= thresholdZoomLevel && (
        <DetailsSourceAndLayers
          backEndService={backEndService}
          backEndID={backEndID}
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
        <PMTilesSource id={PMTILES_SOURCE} keyID={pmtilesKeyID}>
          <DetailsLayers
            sourceID={PMTILES_SOURCE}
            source_layer="etymology_map"
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

      {openFeature && <FeaturePopup feature={openFeature} onClose={closeFeaturePopup} />}
    </Map>
  );
};
