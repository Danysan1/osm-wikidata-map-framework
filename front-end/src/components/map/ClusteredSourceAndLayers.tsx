import { useLoadingSpinnerContext } from "@/src/context/LoadingSpinnerContext";
import { useSnackbarContext } from "@/src/context/SnackbarContext";
import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import { EtymologyResponse } from "@/src/model/EtymologyResponse";
import { MapService } from "@/src/services/MapService";
import type { BBox } from "geojson";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Layer, LngLatLike, MapMouseEvent, Source, useMap } from "react-map-gl/maplibre";

const CLUSTER_LAYER = '_layer_cluster',
    COUNT_LAYER = '_layer_count',
    UNCLUSTERED_LAYER = '_layer_unclustered';

interface ClusteredSourceAndLayersProps {
    backEndService: MapService;
    backEndID: string;

    /** Map source ID */
    sourceID: string;

    /** The name of the field to be used as count */
    countFieldName?: string;

    /** The name of the field to be shown as count (the field value may be equal to the count or be a human-friendly version) */
    countShowFieldName?: string;

    /** GL-JS will automatically add the point_count and point_count_abbreviated properties to each cluster. Other properties can be added with this option. */
    clusterProperties?: object;

    /** Minimum zoom level to show the layers */
    minZoom: number;

    /** Maximum zoom level to show the layers */
    maxZoom: number;

    /** Threshold below which blue clusters are shown */
    minCountThreshold?: number;

    /** Threshold above which pink clusters are shown */
    maxCountThreshold?: number;
}

/**
 * Initializes a generic clustered set of layers on a clustered source
 * 
 * @see https://github.com/visgl/react-map-gl/blob/master/examples/clusters/src/app.tsx
 * @see https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/#geojson
 * @see https://docs.mapbox.com/mapbox-gl-js/example/cluster/
 */
export const ClusteredSourceAndLayers: React.FC<ClusteredSourceAndLayersProps> = (props) => {
    const minThreshold = props.minCountThreshold ?? 3000,
        maxThreshold = props.maxCountThreshold ?? 60000,
        countFieldName = props.countFieldName ?? "point_count",
        countShowFieldName = props.countShowFieldName ?? "point_count_abbreviated",
        clusterLayerID = useMemo(() => props.sourceID + CLUSTER_LAYER, [props.sourceID]),
        countLayerID = useMemo(() => props.sourceID + COUNT_LAYER, [props.sourceID]),
        unclusteredLayerID = useMemo(() => props.sourceID + UNCLUSTERED_LAYER, [props.sourceID]),
        [elementsData, setElementsData] = useState<EtymologyResponse | null>(null),
        { showSnackbar } = useSnackbarContext(),
        { showLoadingSpinner } = useLoadingSpinnerContext(),
        { lat, lon, zoom } = useUrlFragmentContext(),
        { current: map } = useMap(),
        { t, i18n } = useTranslation();

    useEffect(() => {
        if ((props.minZoom && zoom < props.minZoom) || (props.maxZoom && zoom >= props.maxZoom)) return;

        const bounds = map?.getBounds().toArray(),
            bbox: BBox | null = bounds ? [...bounds[0], ...bounds[1]] : null;
        if (bbox && props.backEndService?.canHandleBackEnd(props.backEndID)) {
            if (process.env.NODE_ENV === "development") console.debug(
                "ClusteredSourceAndLayers fetching map elements", { bbox, backEnd: props.backEndID }
            );
            showLoadingSpinner(true);
            props.backEndService.fetchMapElements(props.backEndID, true, bbox, i18n.language).then(data => {
                setElementsData(data);
            }).catch(e => {
                console.error("Failed fetching map elements", e);
                showSnackbar(t("snackbar.map_error"));
            }).finally(() => showLoadingSpinner(false));
        } else {
            if (process.env.NODE_ENV === "development") console.debug(
                "ClusteredSourceAndLayers NOT fetching map elements", { bbox, backEnd: props.backEndID }
            );
            setElementsData(null);
        }
    }, [i18n.language, map, props.backEndID, props.backEndService, props.maxZoom, props.minZoom, lat, lon, zoom, showLoadingSpinner, showSnackbar, t]);

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
    const onClusterClick = useCallback((layerID: string, e: MapMouseEvent) => {
        const feature = map?.queryRenderedFeatures(e.point, { layers: [layerID] })?.[0];
        if (feature?.geometry?.type === "Point") {
            const center = feature.geometry.coordinates as LngLatLike;
            map?.easeTo({
                center: center,
                zoom: map?.getZoom() + 3
            });
        }
    }, [map]);
    const onMouseEnter = useCallback(() => { if (map) map.getCanvas().style.cursor = 'pointer'; }, [map]),
        onMouseLeave = useCallback(() => { if (map) map.getCanvas().style.cursor = ''; }, [map]),
        onClusterLayerClick = useCallback((e: MapMouseEvent) => onClusterClick(clusterLayerID, e), [clusterLayerID, onClusterClick]),
        onUnclusteredLayerClick = useCallback((e: MapMouseEvent) => onClusterClick(unclusteredLayerID, e), [onClusterClick, unclusteredLayerID]);

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

    return elementsData && (
        <Source id={props.sourceID}
            type="geojson"
            data={elementsData}
            maxzoom={props.maxZoom}
            cluster={true}
            clusterMinPoints={1}
            clusterRadius={125} // Radius of each cluster when clustering points (defaults to 50)
            buffer={256}
            clusterProperties={props.clusterProperties}>
            <Layer id={clusterLayerID}
                type="circle"
                minzoom={props.minZoom}
                maxzoom={props.maxZoom}
                filter={['has', countFieldName]}
                paint={{
                    // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
                    // with three steps to implement three types of circles:
                    'circle-color': [
                        'step', ['to-number', ['get', countFieldName]],
                        '#51bbd6', minThreshold, // count < minThreshold => Blue circle
                        '#f1f075', maxThreshold, // minThreshold <= count < maxThreshold => Yellow circle
                        '#f28cb1' // count > maxThreshold => Pink circle
                    ],
                    'circle-opacity': 0.8,
                    'circle-radius': [
                        'interpolate', ['linear'],
                        ['to-number', ['get', countFieldName]],
                        0, 15,
                        minThreshold, 25,
                        maxThreshold, 45,
                    ]
                }} />

            <Layer id={countLayerID}
                type="symbol"
                minzoom={props.minZoom}
                maxzoom={props.maxZoom}
                filter={['has', countFieldName]}
                layout={{
                    'text-font': ["Open Sans Regular"],
                    'text-field': '{' + countShowFieldName + '}',
                    'text-size': 12
                }} />

            <Layer id={unclusteredLayerID}
                type="circle"
                minzoom={props.minZoom}
                maxzoom={props.maxZoom}
                filter={['!', ['has', countFieldName]]}
                paint={{
                    'circle-color': '#51bbd6',
                    'circle-opacity': 0.8,
                    'circle-radius': 15,
                    //'circle-stroke-width': 1,
                    //'circle-stroke-color': '#fff'
                }} />
        </Source>
    );
};
