import { DataDrivenPropertyValueSpecification, Feature, FilterSpecification } from "maplibre-gl";
import { useCallback, useEffect, useMemo } from "react";
import { Layer, MapGeoJSONFeature, MapMouseEvent, useMap } from "react-map-gl/maplibre";

const LOW_ZOOM_POINT_RADIUS = 2,
    MID_ZOOM_POINT_RADIUS = 8,
    HIGH_ZOOM_POINT_RADIUS = 16,
    LOW_ZOOM_LINE_WIDTH = 2,
    MID_ZOOM_LINE_WIDTH = 12,
    HIGH_ZOOM_LINE_WIDTH = 32,
    POINT_LAYER = '_layer_point',
    POINT_TAP_AREA_LAYER = '_layer_point_tapArea',
    LINE_LAYER = '_layer_lineString_line',
    LINE_TAP_AREA_LAYER = '_layer_lineString_tapArea',
    POLYGON_BORDER_LAYER = '_layer_polygon_border',
    POLYGON_FILL_LAYER = '_layer_polygon_fill',
    POLYGON_BORDER_LOW_ZOOM_WIDTH = 2,
    POLYGON_BORDER_HIGH_ZOOM_WIDTH = 6,
    COUNTRY_MAX_ZOOM = 5,
    COUNTRY_ADMIN_LEVEL = 2,
    STATE_MAX_ZOOM = 7,
    STATE_ADMIN_LEVEL = 4,
    PROVINCE_MAX_ZOOM = 9,
    PROVINCE_ADMIN_LEVEL = 6,
    CITY_MAX_ZOOM = 13;

interface DetailsLayersProps {
    minZoom: number;
    sourceID: string;
    keyID?: string;
    source_layer?: string;
    color: DataDrivenPropertyValueSpecification<string>;

    setOpenFeature: (feature?: MapGeoJSONFeature) => void;
}

export const DetailsLayers: React.FC<DetailsLayersProps> = (props) => {
    const createFilter = useCallback((geometryType: Feature["type"]) => {
        const out: FilterSpecification = ["all", ["==", ["geometry-type"], geometryType]];
        if (props.keyID)
            out.push(["in", props.keyID, ["get", "from_key_ids"]]);
        return out;
    }, [props.keyID]);
    const onLayerClick = useCallback((ev: MapMouseEvent & { features?: MapGeoJSONFeature[] | undefined }) => props.setOpenFeature(ev.features?.[0]), [props]);
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
        pointLayerID = useMemo(() => props.sourceID + POINT_LAYER, [props.sourceID]),
        pointTapAreaLayerID = useMemo(() => props.sourceID + POINT_TAP_AREA_LAYER, [props.sourceID]),
        lineLayerID = useMemo(() => props.sourceID + LINE_LAYER, [props.sourceID]),
        lineTapAreaLayerID = useMemo(() => props.sourceID + LINE_TAP_AREA_LAYER, [props.sourceID]),
        polygonBorderLayerID = useMemo(() => props.sourceID + POLYGON_BORDER_LAYER, [props.sourceID]),
        polygonFillLayerID = useMemo(() => props.sourceID + POLYGON_FILL_LAYER, [props.sourceID]),
        {current:map} = useMap();
    
    useEffect(() => { map?.on("click", pointTapAreaLayerID, onLayerClick); }, [map, onLayerClick, pointTapAreaLayerID]);
    useEffect(() => { map?.on("click", lineTapAreaLayerID, onLayerClick); }, [map, onLayerClick, lineTapAreaLayerID]);
    useEffect(() => { map?.on("click", polygonBorderLayerID, onLayerClick); }, [map, onLayerClick, polygonBorderLayerID]);
    useEffect(() => { map?.on("click", polygonFillLayerID, onLayerClick); }, [map, onLayerClick, polygonFillLayerID]);

    return <>
        <Layer id={pointTapAreaLayerID}
            source={props.sourceID}
            type="circle"
            filter={pointFilter}
            source-layer={props.source_layer}
            minzoom={props.minZoom}
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
            source={props.sourceID}
            type="circle"
            filter={pointFilter}
            source-layer={props.source_layer}
            minzoom={props.minZoom}
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

        <Layer id={lineTapAreaLayerID}
            beforeId={pointLayerID} // Lines are shown below points but on top of polygons
            source={props.sourceID}
            type="line"
            filter={lineStringFilter}
            source-layer={props.source_layer}
            minzoom={props.minZoom}
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
            source={props.sourceID}
            type="line"
            filter={lineStringFilter}
            source-layer={props.source_layer}
            minzoom={props.minZoom}
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

        <Layer id={polygonBorderLayerID}
            beforeId={lineLayerID} // Polygon borders are shown below lines and points but on top of polygon fill
            source={props.sourceID}
            type="line"
            filter={polygonFilter}
            source-layer={props.source_layer}
            minzoom={props.minZoom}
            paint={{
                'line-color': props.color,
                'line-opacity': 0.6,
                'line-width': ["step", ["zoom"], POLYGON_BORDER_LOW_ZOOM_WIDTH, CITY_MAX_ZOOM, POLYGON_BORDER_HIGH_ZOOM_WIDTH],
                'line-offset': ["step", ["zoom"], POLYGON_BORDER_LOW_ZOOM_WIDTH / 2, CITY_MAX_ZOOM, POLYGON_BORDER_HIGH_ZOOM_WIDTH / 2], // https://maplibre.org/maplibre-style-spec/layers/#paint-line-line-offset
            }} />

        <Layer id={polygonFillLayerID}
            beforeId={polygonBorderLayerID} // Polygon fill is shown below everything else
            source={props.sourceID}
            type="fill-extrusion"
            filter={polygonFilter}
            source-layer={props.source_layer}
            minzoom={props.minZoom}
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