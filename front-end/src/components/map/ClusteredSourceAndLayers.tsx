import { useLoadingSpinnerContext } from "@/src/context/LoadingSpinnerContext";
import { useSnackbarContext } from "@/src/context/SnackbarContext";
import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import { OwmfResponse } from "@/src/model/OwmfResponse";
import { MapService } from "@/src/services/MapService";
import type { BBox } from "geojson";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Layer, LngLatLike, MapMouseEvent, Source, useMap } from "react-map-gl/maplibre";

const CLUSTER_LAYER = "_layer_cluster",
  COUNT_LAYER = "_layer_count",
  UNCLUSTERED_LAYER = "_layer_unclustered",
  /** Threshold number of elements below which clusters are shown as blue (instead of yellow)*/
  MIN_COUNT_THRESHOLD = 3000,
  /** Threshold number of elements above which clusters are shown as pink (instead of yellow) */
  MAX_COUNT_THRESHOLD = 60000;

interface ClusteredSourceAndLayersProps {
  backEndService: MapService;

  /** Map source ID */
  sourceID: string;

  /** Minimum zoom level to show the layers */
  minZoom: number;

  /** Maximum zoom level to show the layers */
  maxZoom: number;

  useLinkedEntityCount?: boolean;
}

/**
 * Initializes a generic clustered set of layers on a clustered source
 *
 * @see https://github.com/visgl/react-map-gl/blob/master/examples/clusters/src/app.tsx
 * @see https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/#geojson
 * @see https://docs.mapbox.com/mapbox-gl-js/example/cluster/
 */
export const ClusteredSourceAndLayers: FC<ClusteredSourceAndLayersProps> = (props) => {
  /** Maplibre GL-JS will automatically add the point_count and point_count_abbreviated properties to each cluster. Other properties can be added with this option. */
  const clusterProperties = props.useLinkedEntityCount ? {
    linked_entity_count: ["+", ["get", "linked_entity_count"]],
  } : undefined,
    /** The name of the field to be used as count */
    countFieldName = props.useLinkedEntityCount ? "linked_entity_count" : "point_count",
    /** The name of the field to be shown as count (the field value may be equal to the count or be a human-friendly version) */
    countShowFieldName = props.useLinkedEntityCount ? "linked_entity_count" : "point_count_abbreviated",
    clusterLayerID = useMemo(() => props.sourceID + CLUSTER_LAYER, [props.sourceID]),
    countLayerID = useMemo(() => props.sourceID + COUNT_LAYER, [props.sourceID]),
    unclusteredLayerID = useMemo(
      () => props.sourceID + UNCLUSTERED_LAYER,
      [props.sourceID]
    ),
    [elementsData, setElementsData] = useState<OwmfResponse | null>(null),
    { showSnackbar } = useSnackbarContext(),
    { showLoadingSpinner } = useLoadingSpinnerContext(),
    { lat, lon, zoom, year, backEndID } = useUrlFragmentContext(),
    { current: map } = useMap(),
    { t, i18n } = useTranslation();

  useEffect(() => {
    if (
      (props.minZoom && zoom < props.minZoom) ||
      (props.maxZoom && zoom >= props.maxZoom)
    ) {
      console.debug("Zoom level too low/high, NOT fetching map clusters", {
        zoom,
        minZoom: props.minZoom,
        maxZoom: props.maxZoom,
      });
      return;
    }

    if (!props.backEndService?.canHandleBackEnd(backEndID)) {
      console.warn("Unsupported back-end ID, NOT fetching map clusters:", backEndID);
      return;
    }

    const bounds = map?.getBounds()?.toArray(),
      bbox: BBox | null = bounds ? [...bounds[0], ...bounds[1]] : null;
    if (!bbox) {
      console.warn("Missing bbox, NOT fetching map clusters");
      return;
    }

    const bboxArea = Math.abs((bbox[2] - bbox[0]) * (bbox[3] - bbox[1]));
    if (bboxArea < 0.0000001 || bboxArea > 1.6) {
      console.debug("BBox area too big, NOT fetching map clusters", {
        bbox,
        backEndID,
      });
      return;
    }

    console.debug("ClusteredSourceAndLayers fetching map cluster:", backEndID);
    showLoadingSpinner(true);
    props.backEndService
      .fetchMapElements(backEndID, true, bbox, i18n.language, year)
      .then(setElementsData)
      .catch((e) => {
        console.error("Failed fetching map clusters", e);
        showSnackbar(t("snackbar.map_error"));
      })
      .finally(() => showLoadingSpinner(false));
  }, [
    i18n.language,
    map,
    backEndID,
    props.backEndService,
    props.maxZoom,
    props.minZoom,
    lat,
    lon,
    zoom,
    showLoadingSpinner,
    showSnackbar,
    t,
    year,
  ]);

  /**
   * Handles the click on a cluster.
   * For GeoJSON cluster layers, the optimal zoom destination could be obtained with getClusterExpansionZoom().
   * However, this method is not available for vector tile sources.
   * So for uniformity, the zoom is always calculated as the current zoom + 3.
   *
   * @see GeoJSONSource.getClusterExpansionZoom
   * @see https://maplibre.org/maplibre-gl-js/docs/examples/cluster/
   * @see https://docs.mapbox.com/mapbox-gl-js/example/cluster/
   */
  const onClusterClick = useCallback(
    (layerID: string, e: MapMouseEvent) => {
      const feature = map?.queryRenderedFeatures(e.point, { layers: [layerID] })?.[0];
      if (feature?.geometry?.type === "Point") {
        const center = feature.geometry.coordinates as LngLatLike;
        map?.easeTo({
          center: center,
          zoom: map?.getZoom() + 3,
        });
      }
    },
    [map]
  );
  const onMouseEnter = useCallback(() => {
    if (map) map.getCanvas().style.cursor = "pointer";
  }, [map]),
    onMouseLeave = useCallback(() => {
      if (map) map.getCanvas().style.cursor = "";
    }, [map]),
    onClusterLayerClick = useCallback(
      (e: MapMouseEvent) => onClusterClick(clusterLayerID, e),
      [clusterLayerID, onClusterClick]
    ),
    onUnclusteredLayerClick = useCallback(
      (e: MapMouseEvent) => onClusterClick(unclusteredLayerID, e),
      [onClusterClick, unclusteredLayerID]
    );

  useEffect(() => {
    map?.on("mouseenter", clusterLayerID, onMouseEnter);
    return () => void map?.off("mouseenter", clusterLayerID, onMouseEnter);
  }, [map, onMouseEnter, clusterLayerID]);
  useEffect(() => {
    map?.on("mouseleave", clusterLayerID, onMouseLeave);
    return () => void map?.off("mouseleave", clusterLayerID, onMouseLeave);
  }, [map, onMouseLeave, clusterLayerID]);
  useEffect(() => {
    map?.on("click", clusterLayerID, onClusterLayerClick);
    return () => void map?.off("click", clusterLayerID, onClusterLayerClick);
  }, [map, onClusterLayerClick, clusterLayerID]);

  useEffect(() => {
    map?.on("mouseenter", unclusteredLayerID, onMouseEnter);
    return () => void map?.off("mouseenter", unclusteredLayerID, onMouseEnter);
  }, [map, onMouseEnter, unclusteredLayerID]);
  useEffect(() => {
    map?.on("mouseleave", unclusteredLayerID, onMouseLeave);
    return () => void map?.off("mouseleave", unclusteredLayerID, onMouseLeave);
  }, [map, onMouseLeave, unclusteredLayerID]);
  useEffect(() => {
    map?.on("click", unclusteredLayerID, onUnclusteredLayerClick);
    return () => void map?.off("click", unclusteredLayerID, onUnclusteredLayerClick);
  }, [map, onUnclusteredLayerClick, unclusteredLayerID]);

  return (
    elementsData && (
      <Source
        id={props.sourceID}
        type="geojson"
        data={elementsData}
        maxzoom={props.maxZoom}
        cluster={true}
        clusterMinPoints={1}
        clusterRadius={125} // Radius of each cluster when clustering points (defaults to 50)
        buffer={256}
        clusterProperties={clusterProperties}
      >
        <Layer
          id={clusterLayerID}
          type="circle"
          minzoom={props.minZoom}
          maxzoom={props.maxZoom}
          filter={["has", countFieldName]}
          paint={{
            // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
            // with three steps to implement three types of circles:
            "circle-color": [
              "step",
              ["to-number", ["get", countFieldName]],
              "#51bbd6",
              MIN_COUNT_THRESHOLD, // count < MIN_COUNT_THRESHOLD => Blue circle
              "#f1f075",
              MAX_COUNT_THRESHOLD, // MIN_COUNT_THRESHOLD <= count < MAX_COUNT_THRESHOLD => Yellow circle
              "#f28cb1", // count >= MAX_COUNT_THRESHOLD => Pink circle
            ],
            "circle-opacity": 0.8,
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["to-number", ["get", countFieldName]],
              0,
              15,
              MIN_COUNT_THRESHOLD,
              25,
              MAX_COUNT_THRESHOLD,
              45,
            ],
          }}
        />

        <Layer
          id={countLayerID}
          type="symbol"
          minzoom={props.minZoom}
          maxzoom={props.maxZoom}
          filter={["has", countFieldName]}
          layout={{
            "text-font": ["Open Sans Regular"],
            "text-field": "{" + countShowFieldName + "}",
            "text-size": 12,
          }}
        />

        <Layer
          id={unclusteredLayerID}
          type="circle"
          minzoom={props.minZoom}
          maxzoom={props.maxZoom}
          filter={["!", ["has", countFieldName]]}
          paint={{
            "circle-color": "#51bbd6",
            "circle-opacity": 0.8,
            "circle-radius": 15,
            //'circle-stroke-width': 1,
            //'circle-stroke-color': '#fff'
          }}
        />
      </Source>
    )
  );
};
