import { DataDrivenPropertyValueSpecification, ExpressionSpecification, Feature } from "maplibre-gl";
import { FC, useCallback, useEffect, useMemo } from "react";
import { Layer, LayerProps, MapGeoJSONFeature, MapLayerMouseEvent, useMap } from "react-map-gl/maplibre";

const LOW_ZOOM_POINT_RADIUS = 2,
    MID_ZOOM_POINT_RADIUS = 8,
    HIGH_ZOOM_POINT_RADIUS = 16,
    LOW_ZOOM_LINE_WIDTH = 2,
    MID_ZOOM_LINE_WIDTH = 12,
    HIGH_ZOOM_LINE_WIDTH = 32,
    POLYGON_BORDER_LOW_ZOOM_WIDTH = 2,
    POLYGON_BORDER_HIGH_ZOOM_WIDTH = 6,
    COUNTRY_MAX_ZOOM = 5,
    COUNTRY_ADMIN_LEVEL = 2,
    STATE_MAX_ZOOM = 7,
    STATE_ADMIN_LEVEL = 4,
    PROVINCE_MAX_ZOOM = 9,
    PROVINCE_ADMIN_LEVEL = 6,
    CITY_MAX_ZOOM = 12;

type Filter = ["all", ...(boolean | ExpressionSpecification)[]];
const createFilter = (geometryType: Feature["type"], keyID?: string, extraFilter?:ExpressionSpecification) => {
    const out: Filter = ["all", ["==", ["geometry-type"], geometryType]];
    if (keyID)
        out.push(["in", keyID, ["get", "from_key_ids"]]);
    if(extraFilter)
        out.push(extraFilter);
    console.debug("createFilter", geometryType, out);
    return out;
};

export interface DetailsLayersProps {
    minZoom?: number;
    sourceID: string;
    keyID?: string;
    source_layer?: string;
    color: DataDrivenPropertyValueSpecification<string>;
    pointLayerID: string;
    pointTapAreaLayerID: string;
    lineLayerID: string;
    lineTapAreaLayerID: string;
    polygonBorderLayerID: string;
    polygonFillLayerID: string;

    setOpenFeature: (feature: MapGeoJSONFeature) => void;
}

export const DetailsLayers: FC<DetailsLayersProps> = ({
    minZoom, sourceID, keyID, source_layer, color, pointLayerID, pointTapAreaLayerID, lineLayerID, lineTapAreaLayerID, polygonBorderLayerID, polygonFillLayerID, setOpenFeature
}) => {
    /**
     * Open the feature details popup when a feature on a detail layer is clicked.
     * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:click
     */
    const onLayerClick = useCallback((ev: MapLayerMouseEvent & { popupAlreadyShown?: boolean }) => {
        if (ev.popupAlreadyShown) return;
        console.debug(
            "DetailsLayers onLayerClick", { ev, feature: ev.features?.[0]?.properties }
        );
        if (ev.features?.length) {
            setOpenFeature(ev.features[0]);
            ev.popupAlreadyShown = true; // If multiple elements extend over the clicked point, make sure only the first is shown
        }
    }, [setOpenFeature]);

    /** Change the cursor to a pointer when the mouse is over a detail layer
     * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:mouseenterà
     */
    const onMouseEnter = useCallback(
        (ev: MapLayerMouseEvent) => ev.target.getCanvas().style.cursor = 'pointer', []
    );

    /**
     * Change the cursor back to a pointer when it leaves a detail layer.
     * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:mouseleave
     */
    const onMouseLeave = useCallback((ev: MapLayerMouseEvent) => { ev.target.getCanvas().style.cursor = ''; }, []);

    const minNonBoundaryZoom = minZoom ?? CITY_MAX_ZOOM,
        pointFilter = useMemo<Filter>(
            () => createFilter("Point", keyID, [">=", ["zoom"], minNonBoundaryZoom]),
            [keyID, minNonBoundaryZoom]),
        lineStringFilter = useMemo<Filter>(
            () => createFilter("LineString", keyID, [">=", ["zoom"], minNonBoundaryZoom]),
            [keyID, minNonBoundaryZoom]),
        polygonFilter = useMemo<Filter>(() => createFilter(
            "Polygon",
            keyID,
            ["case", // https://maplibre.org/maplibre-style-spec/expressions/#case
                ["all", ["has", "admin_level"], ["<=", ["to-number", ["get", "admin_level"]], COUNTRY_ADMIN_LEVEL]], // Country boundaries
                ["<", ["zoom"], COUNTRY_MAX_ZOOM], // Show country boundaries only below COUNTRY_MAX_ZOOM
                ["all", ["has", "admin_level"], ["<=", ["to-number", ["get", "admin_level"]], STATE_ADMIN_LEVEL]], // State boundaries
                ["all", [">=", ["zoom"], COUNTRY_MAX_ZOOM], ["<", ["zoom"], STATE_MAX_ZOOM]], // Show state boundaries only between COUNTRY_MAX_ZOOM and STATE_MAX_ZOOM
                ["all", ["has", "admin_level"], ["<=", ["to-number", ["get", "admin_level"]], PROVINCE_ADMIN_LEVEL]], // Province boundaries
                ["all", [">=", ["zoom"], STATE_MAX_ZOOM], ["<", ["zoom"], PROVINCE_MAX_ZOOM]], // Show province boundaries only between STATE_MAX_ZOOM and PROVINCE_MAX_ZOOM
                ["to-boolean", ["get", "boundary"]], // City (or other local) boundaries
                ["all", [">=", ["zoom"], PROVINCE_MAX_ZOOM], ["<", ["zoom"], CITY_MAX_ZOOM]], // Show city boundaries only between PROVINCE_MAX_ZOOM and CITY_MAX_ZOOM
                [">=", ["zoom"], minNonBoundaryZoom], // Show non-boundaries only above minNonBoundaryZoom
            ]),
            [keyID, minNonBoundaryZoom]),
        { current: map } = useMap();

    useEffect(() => {
        map?.on("click", pointTapAreaLayerID, onLayerClick);
        map?.on("mouseenter", pointTapAreaLayerID, onMouseEnter);
        map?.on("mouseleave", pointTapAreaLayerID, onMouseLeave);
        return () => void map?.off("click", pointTapAreaLayerID, onLayerClick);
    }, [map, onLayerClick, onMouseEnter, onMouseLeave, pointTapAreaLayerID]);
    useEffect(() => {
        map?.on("click", lineTapAreaLayerID, onLayerClick);
        map?.on("mouseenter", lineTapAreaLayerID, onMouseEnter);
        map?.on("mouseleave", lineTapAreaLayerID, onMouseLeave);
        return () => void map?.off("click", lineTapAreaLayerID, onLayerClick);
    }, [map, onLayerClick, onMouseEnter, onMouseLeave, lineTapAreaLayerID]);
    useEffect(() => {
        map?.on("click", polygonBorderLayerID, onLayerClick);
        map?.on("mouseenter", polygonBorderLayerID, onMouseEnter);
        map?.on("mouseleave", polygonBorderLayerID, onMouseLeave);
        return () => void map?.off("click", polygonBorderLayerID, onLayerClick);
    }, [map, onLayerClick, onMouseEnter, onMouseLeave, polygonBorderLayerID]);
    useEffect(() => {
        map?.on("click", polygonFillLayerID, onLayerClick);
        map?.on("mouseenter", polygonFillLayerID, onMouseEnter);
        map?.on("mouseleave", polygonFillLayerID, onMouseLeave);
        return () => void map?.off("click", polygonFillLayerID, onLayerClick);
    }, [map, onLayerClick, onMouseEnter, onMouseLeave, polygonFillLayerID]);

    const commonLayerProps: Partial<LayerProps> = {
        source: sourceID
    };
    if (minZoom) commonLayerProps.minzoom = minZoom;
    if (source_layer) commonLayerProps["source-layer"] = source_layer;

    return <>
        <Layer id={pointTapAreaLayerID}
            {...commonLayerProps}
            type="circle"
            filter={pointFilter}
            paint={{
                'circle-color': '#ffffff',
                'circle-opacity': 0,
                'circle-radius': [
                    "interpolate", ["linear"], ["zoom"],
                    11, LOW_ZOOM_POINT_RADIUS + 6,
                    16, MID_ZOOM_POINT_RADIUS + 4,
                    21, MID_ZOOM_POINT_RADIUS + 2,
                ],
            }} />

        <Layer id={pointLayerID}
            {...commonLayerProps}
            type="circle"
            filter={pointFilter}
            paint={{
                'circle-color': color,
                'circle-opacity': 0.8,
                'circle-radius': [
                    "interpolate", ["linear"], ["zoom"],
                    11, LOW_ZOOM_POINT_RADIUS,
                    16, MID_ZOOM_POINT_RADIUS,
                    21, HIGH_ZOOM_POINT_RADIUS,
                ],
                'circle-stroke-width': 1,
                'circle-stroke-color': 'white'
            }} />

        <Layer id={lineTapAreaLayerID}
            beforeId={pointLayerID} // Lines are shown below points but on top of polygons
            {...commonLayerProps}
            type="line"
            filter={lineStringFilter}
            paint={{
                'line-color': '#ffffff',
                'line-opacity': 0,
                'line-width': [
                    "interpolate", ["linear"], ["zoom"],
                    11, LOW_ZOOM_LINE_WIDTH + 6,
                    16, MID_ZOOM_LINE_WIDTH + 4,
                    21, HIGH_ZOOM_LINE_WIDTH + 2,
                ],
            }} />

        <Layer id={lineLayerID}
            beforeId={pointLayerID} // Lines are shown below points but on top of polygons
            {...commonLayerProps}
            type="line"
            filter={lineStringFilter}
            paint={{
                'line-color': color,
                'line-opacity': 0.6,
                'line-width': [
                    "interpolate", ["linear"], ["zoom"],
                    11, LOW_ZOOM_LINE_WIDTH,
                    16, MID_ZOOM_LINE_WIDTH,
                    21, HIGH_ZOOM_LINE_WIDTH,
                ],
            }} />

        <Layer id={polygonBorderLayerID}
            beforeId={lineLayerID} // Polygon borders are shown below lines and points but on top of polygon fill
            {...commonLayerProps}
            type="line"
            filter={polygonFilter}
            paint={{
                'line-color': color,
                'line-opacity': 0.6,
                'line-width': ["step", ["zoom"], POLYGON_BORDER_LOW_ZOOM_WIDTH, CITY_MAX_ZOOM, POLYGON_BORDER_HIGH_ZOOM_WIDTH],
                'line-offset': ["step", ["zoom"], POLYGON_BORDER_LOW_ZOOM_WIDTH / 2, CITY_MAX_ZOOM, POLYGON_BORDER_HIGH_ZOOM_WIDTH / 2], // https://maplibre.org/maplibre-style-spec/layers/#paint-line-line-offset
            }} />

        <Layer id={polygonFillLayerID}
            beforeId={polygonBorderLayerID} // Polygon fill is shown below everything else
            {...commonLayerProps}
            type="fill-extrusion"
            filter={polygonFilter}
            paint={{ // https://maplibre.org/maplibre-gl-js/docs/examples/3d-buildings/
                'fill-extrusion-color': color,
                'fill-extrusion-opacity': 0.3,
                'fill-extrusion-height': [
                    'interpolate', ['linear'], ['zoom'],
                    15, 0,
                    16, ['to-number', ['coalesce', ['get', 'render_height'], 0]]
                ],
            }} />
    </>
}