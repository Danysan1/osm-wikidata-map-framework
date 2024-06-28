import { DataDrivenPropertyValueSpecification, Feature, FilterSpecification } from "maplibre-gl";
import { useCallback, useEffect, useMemo } from "react";
import { Layer, MapGeoJSONFeature, MapLayerMouseEvent, useMap } from "react-map-gl/maplibre";

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
    CITY_MAX_ZOOM = 13;

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

    setOpenFeature: (feature?: MapGeoJSONFeature) => void;
}

export const DetailsLayers: React.FC<DetailsLayersProps> = (props) => {
    const createFilter = useCallback((geometryType: Feature["type"]) => {
        const out: FilterSpecification = ["all", ["==", ["geometry-type"], geometryType]];
        if (props.keyID)
            out.push(["in", props.keyID, ["get", "from_key_ids"]]);
        return out;
    }, [props.keyID]);
    const onLayerClick = useCallback((ev: MapLayerMouseEvent) => {
        if (process.env.NODE_ENV === "development") console.debug("DetailsLayers onLayerClick", { ev, feature: ev.features?.[0]?.properties });
        props.setOpenFeature(ev.features?.[0]);
    }, [props]);
    const pointFilter = useMemo(() => createFilter("Point"), [createFilter]),
        lineStringFilter = useMemo(() => createFilter("LineString"), [createFilter]),
        polygonFilter = useMemo(() => {
            const filter = createFilter("Polygon");
            filter.push(["case",
                ["all", ["has", "admin_level"], ["<=", ["to-number", ["get", "admin_level"]], COUNTRY_ADMIN_LEVEL]], ["<", ["zoom"], COUNTRY_MAX_ZOOM], // Show country boundaries only below COUNTRY_MAX_ZOOM
                ["all", ["has", "admin_level"], ["<=", ["to-number", ["get", "admin_level"]], STATE_ADMIN_LEVEL]], ["all", [">=", ["zoom"], COUNTRY_MAX_ZOOM], ["<", ["zoom"], STATE_MAX_ZOOM]], // Show state boundaries only between COUNTRY_MAX_ZOOM and STATE_MAX_ZOOM
                ["all", ["has", "admin_level"], ["<=", ["to-number", ["get", "admin_level"]], PROVINCE_ADMIN_LEVEL]], ["all", [">=", ["zoom"], STATE_MAX_ZOOM], ["<", ["zoom"], PROVINCE_MAX_ZOOM]], // Show province boundaries only between STATE_MAX_ZOOM and PROVINCE_MAX_ZOOM
                ["to-boolean", ["get", "boundary"]], ["all", [">=", ["zoom"], PROVINCE_MAX_ZOOM], ["<", ["zoom"], CITY_MAX_ZOOM]], // Show city boundaries only between PROVINCE_MAX_ZOOM and CITY_MAX_ZOOM
                [">=", ["zoom"], CITY_MAX_ZOOM], // Show non-boundaries only above thresholdZoomLevel
            ]);
            return filter;
        }, [createFilter]),
        { current: map } = useMap();

    useEffect(() => { 
        map?.on("click", props.pointTapAreaLayerID, onLayerClick);
        return () => void map?.off("click", props.pointTapAreaLayerID, onLayerClick);
     }, [map, onLayerClick, props.pointTapAreaLayerID]);
    useEffect(() => { 
        map?.on("click", props.lineTapAreaLayerID, onLayerClick);
        return () => void map?.off("click", props.lineTapAreaLayerID, onLayerClick);
     }, [map, onLayerClick, props.lineTapAreaLayerID]);
    useEffect(() => { 
        map?.on("click", props.polygonBorderLayerID, onLayerClick);
        return () => void map?.off("click", props.polygonBorderLayerID, onLayerClick);
     }, [map, onLayerClick, props.polygonBorderLayerID]);
    useEffect(() => { 
        map?.on("click", props.polygonFillLayerID, onLayerClick);
        return () => void map?.off("click", props.polygonFillLayerID, onLayerClick);
     }, [map, onLayerClick, props.polygonFillLayerID]);

    const commonProps: { 'source': string, 'minzoom'?: number, 'source-layer'?: string } = {
        source: props.sourceID
    };
    if (props.minZoom) commonProps.minzoom = props.minZoom;
    if (props.source_layer) commonProps["source-layer"] = props.source_layer;

    if (process.env.NODE_ENV === "development") console.log("DetailsLayers", { ...props, pointFilter, lineStringFilter, polygonFilter });
    return <>
        <Layer id={props.pointTapAreaLayerID}
            {...commonProps}
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

        <Layer id={props.pointLayerID}
            {...commonProps}
            type="circle"
            filter={pointFilter}
            paint={{
                'circle-color': props.color,
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

        <Layer id={props.lineTapAreaLayerID}
            beforeId={props.pointLayerID} // Lines are shown below points but on top of polygons
            {...commonProps}
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

        <Layer id={props.lineLayerID}
            beforeId={props.pointLayerID} // Lines are shown below points but on top of polygons
            {...commonProps}
            type="line"
            filter={lineStringFilter}
            paint={{
                'line-color': props.color,
                'line-opacity': 0.6,
                'line-width': [
                    "interpolate", ["linear"], ["zoom"],
                    11, LOW_ZOOM_LINE_WIDTH,
                    16, MID_ZOOM_LINE_WIDTH,
                    21, HIGH_ZOOM_LINE_WIDTH,
                ],
            }} />

        <Layer id={props.polygonBorderLayerID}
            beforeId={props.lineLayerID} // Polygon borders are shown below lines and points but on top of polygon fill
            {...commonProps}
            type="line"
            filter={polygonFilter}
            paint={{
                'line-color': props.color,
                'line-opacity': 0.6,
                'line-width': ["step", ["zoom"], POLYGON_BORDER_LOW_ZOOM_WIDTH, CITY_MAX_ZOOM, POLYGON_BORDER_HIGH_ZOOM_WIDTH],
                'line-offset': ["step", ["zoom"], POLYGON_BORDER_LOW_ZOOM_WIDTH / 2, CITY_MAX_ZOOM, POLYGON_BORDER_HIGH_ZOOM_WIDTH / 2], // https://maplibre.org/maplibre-style-spec/layers/#paint-line-line-offset
            }} />

        <Layer id={props.polygonFillLayerID}
            beforeId={props.polygonBorderLayerID} // Polygon fill is shown below everything else
            {...commonProps}
            type="fill-extrusion"
            filter={polygonFilter}
            paint={{ // https://maplibre.org/maplibre-gl-js/docs/examples/3d-buildings/
                'fill-extrusion-color': props.color,
                'fill-extrusion-opacity': 0.3,
                'fill-extrusion-height': [
                    'interpolate', ['linear'], ['zoom'],
                    15, 0,
                    16, ['to-number', ['coalesce', ['get', 'render_height'], 0]]
                ],
            }} />
    </>
}