import { default as mapLibrary, Map, Popup, NavigationControl, GeolocateControl, ScaleControl, FullscreenControl, GeoJSONSource, GeoJSONSourceSpecification, LngLatLike, CircleLayerSpecification, SymbolLayerSpecification, MapMouseEvent, GeoJSONFeature, IControl, MapSourceDataEvent, MapDataEvent, RequestTransformFunction, LngLat, VectorTileSource, AddLayerObject, LineLayerSpecification, FillLayerSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import "@maptiler/geocoding-control/style.css";

// import { default as mapLibrary, Map, Popup, NavigationControl, GeolocateControl, ScaleControl, FullscreenControl, GeoJSONSource, GeoJSONSourceRaw as GeoJSONSourceSpecification, LngLatLike, CircleLayer as CircleLayerSpecification, SymbolLayer as SymbolLayerSpecification, MapMouseEvent, MapboxGeoJSONFeature as GeoJSONFeature, IControl, MapSourceDataEvent, MapDataEvent, TransformRequestFunction as RequestTransformFunction, LngLat, VectorTileSource } from 'mapbox-gl';
// import 'mapbox-gl/dist/mapbox-gl.css';

import { logErrorMessage } from './monitoring';
import { getCorrectFragmentParams, getFragmentParams, setFragmentParams } from './fragment';
import { BackgroundStyle, BackgroundStyleControl } from './controls/BackgroundStyleControl';
import { EtymologyColorControl, getCurrentColorScheme } from './controls/EtymologyColorControl';
import { InfoControl, openInfoWindow } from './controls/InfoControl';
import { featureToDomElement } from "./components/FeatureElement";
import { showLoadingSpinner, showSnackbar } from './snackbar';
import { debug, getBoolConfig, getConfig } from './config';
import { SourceControl } from './controls/SourceControl';
import { LanguageControl } from './controls/LanguageControl';
import { GeoJSON, BBox } from 'geojson';
import { loadTranslator } from './i18n';
import { LinkControl } from './controls/LinkControl';
import { DataTableControl } from './controls/DataTableControl';
import './style.css';
import { WikidataMapService } from './services/WikidataMapService';
import { OverpassService } from './services/OverpassService';
import { OverpassWikidataMapService } from './services/OverpassWikidataMapService';
import { MapDatabase } from './db/MapDatabase';
import { OwmfBackendService } from './services/OwmfBackendService';
import { OsmWikidataMatcherControl } from './controls/OsmWikidataMatcherControl';
import { MapCompleteControl } from './controls/MapCompleteControl';
import { iDEditorControl } from './controls/iDEditorControl';
import { Protocol } from 'pmtiles';

const defaultBackgroundStyle = new URLSearchParams(window.location.search).get("style") || getConfig("default_background_style") || 'stadia_alidade',
    WIKIDATA_SOURCE = "wikidata_source",
    wikidata_layer_point = WIKIDATA_SOURCE + '_layer_point',
    wikidata_layer_lineString = WIKIDATA_SOURCE + '_layer_lineString',
    wikidata_layer_polygon_border = WIKIDATA_SOURCE + '_layer_polygon_border',
    wikidata_layer_polygon_fill = WIKIDATA_SOURCE + '_layer_polygon_fill',
    ELEMENTS_SOURCE = "elements_source",
    GLOBAL_SOURCE = "global_source";

export class EtymologyMap extends Map {
    private backgroundStyles: BackgroundStyle[];
    private startBackgroundStyle: BackgroundStyle;
    private anyFeatureClickedBefore = false;
    private wikidataSourceInitialized = false;
    private wikidataMapService: WikidataMapService;
    private overpassService: OverpassService;
    private overpassWikidataService: OverpassWikidataMapService;
    private backendService: OwmfBackendService;
    private lastSourceID?: string;
    private lastBBox?: BBox;
    private fetchInProgress = false;
    private shouldFetchAgain = false

    constructor(
        containerId: string,
        backgroundStyles: BackgroundStyle[],
        requestTransformFunc?: RequestTransformFunction
    ) {
        let backgroundStyleObj = backgroundStyles.find(style => style.id == defaultBackgroundStyle);
        if (!backgroundStyleObj) {
            logErrorMessage("Invalid default background style", "error", { defaultBackgroundStyle });
            backgroundStyleObj = backgroundStyles[0];
        }
        const startParams = getCorrectFragmentParams();
        if (debug) console.debug("Instantiating map", { containerId, backgroundStyleObj, startParams });

        super({
            container: containerId,
            style: backgroundStyleObj.styleUrl,
            center: [startParams.lon, startParams.lat], // starting position [lon, lat]
            zoom: startParams.zoom, // starting zoom
            //projection: { name: 'mercator' },
            transformRequest: requestTransformFunc
        });
        this.startBackgroundStyle = backgroundStyleObj;
        this.backgroundStyles = backgroundStyles;
        const db = new MapDatabase();
        this.wikidataMapService = new WikidataMapService(db);
        this.overpassService = new OverpassService(db);
        this.overpassWikidataService = new OverpassWikidataMapService(this.overpassService, this.wikidataMapService, db);
        this.backendService = new OwmfBackendService(db);

        try {
            openInfoWindow(this, false);
        } catch (e) {
            console.error("Info window error:", e);
        }

        this.on('load', this.mapLoadedHandler);
        this.on('styledata', this.mapStyleDataHandler);
        this.on('sourcedata', this.mapSourceDataHandler);
        this.on('error', this.mapErrorHandler);

        //this.dragRotate.disable(); // disable map rotation using right click + drag
        //this.touchZoomRotate.disableRotation(); // disable map rotation using touch rotation gesture

        //eslint-disable-next-line
        const thisMap = this; // Needed to prevent overwriting of "this" in the window event handler ( https://stackoverflow.com/a/21299126/2347196 )
        window.addEventListener('hashchange', function () { thisMap.hashChangeHandler() }, false);
    }

    /**
     * Handles the 'styledata' event
     * This event is executed very often, mupltiple times per base map change
     * However it's the only reliable event for intercepting base map changes
     * 
     * @see mapStyleLoadHandler
     * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:styledata
     * @see https://docs.mapbox.com/mapbox-gl-js/api/events/#mapdataevent
     */
    private mapStyleDataHandler(e: MapDataEvent) {
        if (debug) console.debug("mapStyleDataHandler", e);
        this.setCulture();
        this.lastSourceID = undefined;
        this.updateDataSource();
    }

    /**
     * Handles the 'style.load' event
     * This event should handle the change of base map
     * It fires only one time but it's not reliable
     * 
     * @see mapStyleDataHandler
     * @see https://bl.ocks.org/ryanbaumann/7f9a353d0a1ae898ce4e30f336200483/96bea34be408290c161589dcebe26e8ccfa132d7
     * @see https://github.com/mapbox/mapbox-gl-js/issues/3979
     * @see https://github.com/mapbox/mapbox-gl-js/issues/7579
     */
    private mapStyleLoadHandler() {
        // if (enable_debug_log) console.info("mapStyleLoadHandler");
        // this.setCulture();
        // this.updateDataSource();
    }

    /**
     * Handles the change of the URL fragment
     */
    private hashChangeHandler(/*e: HashChangeEvent*/) {
        const newParams = getCorrectFragmentParams(),
            currLat = this.getCenter().lat,
            currLon = this.getCenter().lng,
            currZoom = this.getZoom();
        if (debug) console.debug("hashChangeHandler", { newParams, currLat, currLon, currZoom });

        // Check if the position has changed in order to avoid unnecessary map movements
        if (Math.abs(currLat - newParams.lat) > 0.001 ||
            Math.abs(currLon - newParams.lon) > 0.001 ||
            Math.abs(currZoom - newParams.zoom) > 0.1
        ) {
            this.flyTo({
                center: [newParams.lon, newParams.lat],
                zoom: newParams.zoom,
            });
        }
    }

    private fetchCompleted() {
        if (debug) console.debug("fetchCompleted", { shouldFetchAgain: this.shouldFetchAgain });
        this.fetchInProgress = false;
        showLoadingSpinner(false);
        if (this.shouldFetchAgain) {
            this.shouldFetchAgain = false;
            this.updateDataSource();
        }
    }

    /**
     * Event listener that fires when one of the map's sources loads or changes.
     * 
     * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:sourcedata
     * @see https://docs.mapbox.com/mapbox-gl-js/api/events/#mapdataevent
     */
    private mapSourceDataHandler(e: MapSourceDataEvent) {
        if (!e.isSourceLoaded || e.dataType !== "source")
            return;

        const wikidataSourceEvent = e.sourceId === WIKIDATA_SOURCE,
            elementsSourceEvent = e.sourceId === ELEMENTS_SOURCE,
            globalSourceEvent = e.sourceId === GLOBAL_SOURCE;

        if (wikidataSourceEvent || elementsSourceEvent || globalSourceEvent) {
            if (debug) console.debug("mapSourceDataHandler: data loaded", {
                wikidataSourceEvent, elementsSourceEvent, globalSourceEvent, e, source: e.sourceId
            });
            this.fetchCompleted();

            const noFeatures = wikidataSourceEvent &&
                e.source.type === "geojson" && // Vector tile sources don't support querySourceFeatures()
                this.querySourceFeatures(WIKIDATA_SOURCE).length === 0;
            loadTranslator().then(t => {
                if (!this.wikidataSourceInitialized)
                    this.wikidataSourceInitialized = true;
                else if (noFeatures)
                    showSnackbar(t("snackbar.no_data_in_this_area", "No data in this area"), "wheat", 3000);
                else if (wikidataSourceEvent && !this.anyFeatureClickedBefore)
                    showSnackbar(t("snackbar.data_loaded_instructions", "Data loaded, click on any highlighted element to show its details"), "lightgreen", 10000);
                else
                    showSnackbar(t("snackbar.data_loaded", "Data loaded"), "lightgreen", 3000);
            });
        }
    }

    /**
     * 
     * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:error
     */
    private mapErrorHandler(err: any) {
        let errorMessage;
        if ([GLOBAL_SOURCE, ELEMENTS_SOURCE, WIKIDATA_SOURCE].includes(err.sourceId)) {
            this.fetchCompleted();
            loadTranslator().then(t => showSnackbar(t("snackbar.fetch_error")));
            errorMessage = "An error occurred while fetching " + err.sourceId;
        } else {
            loadTranslator().then(t => showSnackbar(t("snackbar.map_error")));
            errorMessage = "Map error: " + err.sourceId + " - " + err.error.message
        }
        logErrorMessage(errorMessage, "error", err);
    }

    private updateDataSource() {
        if (this.fetchInProgress) {
            this.shouldFetchAgain = true;
            if (debug) console.debug("updateDataSource: Fetch already in progress, skipping source update");
            return;
        }
        const bounds = this.getBounds(),
            southWest = bounds.getSouthWest(),
            northEast = bounds.getNorthEast(),
            zoomLevel = this.getZoom(),
            sourceID = getCorrectFragmentParams().source,
            minZoomLevel = parseInt(getConfig("min_zoom_level") ?? "9"),
            thresholdZoomLevel = parseInt(getConfig("threshold_zoom_level") ?? "14"),
            wikidataBBoxMaxArea = parseFloat(getConfig("wikidata_bbox_max_area") ?? "1"),
            elementsBBoxMaxArea = parseFloat(getConfig("elements_bbox_max_area") ?? "10"),
            area = (northEast.lat - southWest.lat) * (northEast.lng - southWest.lng),
            enableWikidataLayers = zoomLevel >= thresholdZoomLevel && area < wikidataBBoxMaxArea,
            enableElementsLayers = !enableWikidataLayers && (
                (zoomLevel >= minZoomLevel && area < elementsBBoxMaxArea) || sourceID.startsWith("pmtiles")
            );
        if (debug) console.debug("updateDataSource", {
            area, zoomLevel, minZoomLevel, thresholdZoomLevel, enableElementsLayers, enableWikidataLayers,
        });

        if (enableElementsLayers)
            this.updateElementsSource(southWest, northEast, minZoomLevel, thresholdZoomLevel);
        else if (enableWikidataLayers)
            this.updateWikidataSource(southWest, northEast, thresholdZoomLevel);
        else if (sourceID.startsWith("db"))
            this.prepareGlobalLayers(minZoomLevel);
        else
            loadTranslator().then(t => showSnackbar(t("snackbar.zoom_in"), "wheat", 15_000));
    }

    private isBBoxChanged(bbox: BBox): boolean {
        const isBBoxChanged = !!this.lastBBox && (
            this.lastBBox[0] > bbox[0] ||
            this.lastBBox[1] > bbox[1] ||
            this.lastBBox[2] < bbox[2] ||
            this.lastBBox[3] < bbox[3]
        );
        if (debug) console.debug("isBBoxChanged", isBBoxChanged, { lastBBox: this.lastBBox, bbox });
        return isBBoxChanged;
    }

    private updateElementsSource(southWest: LngLat, northEast: LngLat, minZoomLevel: number, thresholdZoomLevel: number) {
        const sourceID = getCorrectFragmentParams().source,
            fullSourceID = "elements-" + sourceID,
            sourceIDChanged = !this.lastSourceID || this.lastSourceID !== fullSourceID;

        if (sourceIDChanged && sourceID.startsWith("pmtiles")) {
            if (debug) console.debug("Updating pmtiles elements source", sourceID);
            this.lastSourceID = fullSourceID;
            this.preparePMTilesSource(
                ELEMENTS_SOURCE,
                "elements.pmtiles",
                undefined,
                thresholdZoomLevel
            );
            this.prepareElementsLayers(thresholdZoomLevel);

            // pmtiles vector source covers both very-low-zoom and medium-zoom levels
            // GeoJSON sources cover them separately
            if (debug) console.debug("Initialized PMTiles elements source, removing global GeoJSON source");
            this.removeSourceWithLayers(GLOBAL_SOURCE);
        } else if (sourceIDChanged && sourceID.startsWith("vector")) {
            if (debug) console.debug("Updating vector elements source", sourceID);
            this.lastSourceID = fullSourceID;
            this.prepareVectorSource(
                ELEMENTS_SOURCE,
                `elements?source=${sourceID.replace("vector_", "")}`,
                undefined,
                thresholdZoomLevel
            );
            this.prepareElementsLayers(thresholdZoomLevel);
        } else {
            const bbox: BBox = [
                Math.floor(southWest.lng * 10) / 10, // 0.123 => 0.1
                Math.floor(southWest.lat * 10) / 10,
                Math.ceil(northEast.lng * 10) / 10, // 0.123 => 0.2
                Math.ceil(northEast.lat * 10) / 10
            ];
            if (sourceIDChanged || this.isBBoxChanged(bbox)) {
                if (debug) console.debug("Updating GeoJSON elements source:", sourceID);
                this.lastSourceID = fullSourceID;
                this.lastBBox = bbox;
                this.updateElementsGeoJSONSource(sourceID, bbox, minZoomLevel, thresholdZoomLevel);
            }
        }
    }

    private async updateElementsGeoJSONSource(sourceID: string, bbox: BBox, minZoomLevel: number, thresholdZoomLevel: number) {
        this.fetchInProgress = true;

        try {
            showLoadingSpinner(true);
            let data: GeoJSON | undefined;
            if (this.wikidataMapService.canHandleSource(sourceID))
                data = await this.wikidataMapService.fetchMapData(sourceID, bbox);
            else if (this.overpassService.canHandleSource(sourceID))
                data = await this.overpassService.fetchMapClusterElements(sourceID, bbox);
            else if (this.overpassWikidataService.canHandleSource(sourceID))
                data = await this.overpassWikidataService.fetchMapClusterElements(sourceID, bbox);
            else if (this.backendService.canHandleSource(sourceID))
                data = await this.backendService.fetchMapClusterElements(sourceID, bbox);
            else
                throw new Error("No service found for source ID " + sourceID);

            if (!data)
                throw new Error("No data found");

            this.prepareGeoJSONSourceAndClusteredLayers(
                ELEMENTS_SOURCE,
                data,
                minZoomLevel,
                thresholdZoomLevel,
                undefined,
                "point_count",
                "point_count_abbreviated"
            );
        } catch (e) {
            logErrorMessage("updateElementsGeoJSONSource: Error fetching map data", "error", { sourceID, bbox, e });
            this.fetchCompleted();
        }
    }

    private updateWikidataSource(southWest: LngLat, northEast: LngLat, thresholdZoomLevel: number) {
        const sourceID = getCorrectFragmentParams().source,
            fullSourceID = "details-" + sourceID,
            sourceIDChanged = !this.lastSourceID || this.lastSourceID !== fullSourceID;

        if (sourceIDChanged && sourceID.startsWith("pmtiles")) {
            this.lastSourceID = fullSourceID;
            this.preparePMTilesSource(
                WIKIDATA_SOURCE,
                "etymology_map.pmtiles",
                thresholdZoomLevel
            );
            this.prepareWikidataLayers(thresholdZoomLevel, "etymology_map");
        } else if (sourceIDChanged && sourceID.startsWith("vector")) {
            this.lastSourceID = fullSourceID;
            this.prepareVectorSource(
                WIKIDATA_SOURCE,
                `etymology_map?source=${sourceID.replace("vector_", "")}&lang=${document.documentElement.lang}`,
                thresholdZoomLevel
            );
            this.prepareWikidataLayers(thresholdZoomLevel, "etymology_map");
        } else {
            const bbox: BBox = [
                Math.floor(southWest.lng * 100) / 100, // 0.123 => 0.12
                Math.floor(southWest.lat * 100) / 100,
                Math.ceil(northEast.lng * 100) / 100, // 0.123 => 0.13
                Math.ceil(northEast.lat * 100) / 100
            ];
            if (sourceIDChanged || this.isBBoxChanged(bbox)) {
                this.lastSourceID = fullSourceID;
                this.lastBBox = bbox;
                this.prepareWikidataGeoJSONSource(sourceID, bbox, thresholdZoomLevel);
            }
        }
    }

    private async prepareWikidataGeoJSONSource(sourceID: string, bbox: BBox, minZoom: number) {
        this.fetchInProgress = true;

        try {
            showLoadingSpinner(true);
            let data: GeoJSON | undefined;
            if (this.wikidataMapService.canHandleSource(sourceID))
                data = await this.wikidataMapService.fetchMapData(sourceID, bbox);
            else if (this.overpassService.canHandleSource(sourceID))
                data = await this.overpassService.fetchMapElementDetails(sourceID, bbox);
            else if (this.overpassWikidataService.canHandleSource(sourceID))
                data = await this.overpassWikidataService.fetchMapElementDetails(sourceID, bbox);
            else if (this.backendService.canHandleSource(sourceID))
                data = await this.backendService.fetchMapElementDetails(sourceID, bbox);
            else
                throw new Error("No service found for source ID " + sourceID);

            if (!data)
                throw new Error("No data found");

            this.addOrUpdateGeoJSONSource(
                WIKIDATA_SOURCE,
                {
                    type: 'geojson',
                    // buffer: 512, // This only works on already downloaded data
                    data,
                    // attribution: 'Etymology: <a href="https://www.wikidata.org/wiki/Wikidata:Introduction">Wikidata</a>',
                }
            );
            this.prepareWikidataLayers(minZoom);
        } catch (e) {
            logErrorMessage("prepareWikidataGeoJSONSource: Error fetching map data", "error", { sourceID, bbox, e });
            this.fetchCompleted();
        }
    }

    private prepareVectorSource(sourceID: string, sourceURL: string, minZoom?: number, maxZoom?: number) {
        const oldSource = this.getSource(sourceID);
        if (oldSource && oldSource.type === "vector" && (oldSource as VectorTileSource).url !== sourceURL)
            (oldSource as VectorTileSource).url = sourceURL;

        if (oldSource && oldSource.type !== "vector")
            this.removeSourceWithLayers(sourceID);

        if (!this.getSource(sourceID)) {
            this.addSource(sourceID, {
                type: 'vector',
                url: sourceURL,
                maxzoom: maxZoom || 15,
                minzoom: minZoom || 0,
            });
        }
    }

    /**
     * Prepares or updates the source for the layers from the PMTiles file.
     * 
     * @see https://docs.protomaps.com/
     * @see https://docs.protomaps.com/pmtiles/maplibre
     */
    private preparePMTilesSource(sourceID: string, fileName: string, minZoom?: number, maxZoom?: number) {
        const pmtilesBaseURL = getConfig("pmtiles_base_url");
        if (!pmtilesBaseURL)
            throw new Error("Missing pmtiles URL");

        const oldSource = this.getSource(sourceID),
            fullPMTilesURL = `pmtiles://${pmtilesBaseURL}${fileName}`;
        if (oldSource && oldSource.type === "vector" && (oldSource as VectorTileSource).url !== fullPMTilesURL)
            (oldSource as VectorTileSource).url = fullPMTilesURL;

        if (oldSource && oldSource.type !== "vector")
            this.removeSourceWithLayers(sourceID);

        if (!this.getSource(sourceID)) {
            const protocol = new Protocol();
            mapLibrary.addProtocol("pmtiles", protocol.tile);

            this.addSource(sourceID, {
                type: 'vector',
                url: fullPMTilesURL,
                maxzoom: maxZoom || 15,
                minzoom: minZoom || 0,
            });
        }
    }

    private removeSourceWithLayers(sourceID: string) {
        if (this.getLayer(sourceID + '_layer_cluster')) this.removeLayer(sourceID + '_layer_cluster');
        if (this.getLayer(sourceID + '_layer_count')) this.removeLayer(sourceID + '_layer_count');
        if (this.getLayer(sourceID + '_layer_point')) this.removeLayer(sourceID + '_layer_point');
        if (this.getLayer(sourceID + '_layer_lineString')) this.removeLayer(sourceID + '_layer_lineString');
        if (this.getLayer(sourceID + '_layer_polygon_border')) this.removeLayer(sourceID + '_layer_polygon_border');
        if (this.getLayer(sourceID + '_layer_polygon_fill')) this.removeLayer(sourceID + '_layer_polygon_fill');
        if (this.getSource(sourceID)) this.removeSource(sourceID);
    }

    /**
     * Initializes the high-zoom-level complete (un-clustered) layer.
     * 
     * The order of declaration is important:
     * initWikidataLayer() adds the click handler. If a point and a polygon are overlapped, the point has precedence. This is imposed by declaring it first.
     * On the other side, the polygon must be show underneath the point. This is imposed by specifying the second parameter of addLayer()
     * 
     * @see initWikidataLayer
     * @see https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/#geojson
     * @see https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/#geojson-attribution
     * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map#addlayer
     * @see https://docs.mapbox.com/mapbox-gl-js/example/geojson-layer-in-stack/
     */
    private prepareWikidataLayers(minZoom: number, source_layer?: string) {
        const colorSchemeColor = getCurrentColorScheme().color || '#223b53';


        if (!this.getLayer(wikidata_layer_point)) {
            const spec: CircleLayerSpecification = {
                'id': wikidata_layer_point,
                'source': WIKIDATA_SOURCE,
                'type': 'circle',
                "filter": ["==", ["geometry-type"], "Point"],
                "minzoom": minZoom,
                'paint': {
                    'circle-radius': 12,
                    'circle-stroke-width': 2,
                    'circle-color': colorSchemeColor,
                    'circle-stroke-color': 'white'
                }
            };
            if (source_layer)
                spec["source-layer"] = source_layer;
            this.addLayer(spec);
            this.initWikidataLayer(wikidata_layer_point);
        }

        if (!this.getLayer(wikidata_layer_lineString)) {
            const spec: LineLayerSpecification = {
                'id': wikidata_layer_lineString,
                'source': WIKIDATA_SOURCE,
                'type': 'line',
                "filter": ["==", ["geometry-type"], "LineString"],
                "minzoom": minZoom,
                'paint': {
                    'line-color': colorSchemeColor,
                    'line-opacity': 0.5,
                    'line-width': 18
                }
            };
            if (source_layer)
                spec["source-layer"] = source_layer;
            this.addLayer(spec, wikidata_layer_point);
            this.initWikidataLayer(wikidata_layer_lineString);
        }

        if (!this.getLayer(wikidata_layer_polygon_border)) {
            const spec: LineLayerSpecification = {
                'id': wikidata_layer_polygon_border,
                'source': WIKIDATA_SOURCE,
                'type': 'line',
                "filter": ["==", ["geometry-type"], "Polygon"],
                "minzoom": minZoom,
                'paint': {
                    'line-color': colorSchemeColor,
                    'line-opacity': 0.5,
                    'line-width': 12,
                    'line-offset': 6, // https://docs.mapbox.com/mapbox-gl-js/style-spec/layers/#paint-line-line-offset
                }
            };
            if (source_layer)
                spec["source-layer"] = source_layer;
            this.addLayer(spec, wikidata_layer_lineString);
            this.initWikidataLayer(wikidata_layer_polygon_border);
        }

        if (!this.getLayer(wikidata_layer_polygon_fill)) {
            const spec: FillLayerSpecification = {
                'id': wikidata_layer_polygon_fill,
                'source': WIKIDATA_SOURCE,
                'type': 'fill',
                "filter": ["==", ["geometry-type"], "Polygon"],
                "minzoom": minZoom,
                'paint': {
                    'fill-color': colorSchemeColor,
                    'fill-opacity': 0.5,
                    'fill-outline-color': "rgba(0, 0, 0, 0)",
                }
            };
            if (source_layer)
                spec["source-layer"] = source_layer;
            this.addLayer(spec, wikidata_layer_polygon_border);
            this.initWikidataLayer(wikidata_layer_polygon_fill);
        }
    }

    private initWikidataControls() {
        if (debug) console.debug("Initializing Wikidata controls");
        loadTranslator().then(t => {
            const minZoomLevel = parseInt(getConfig("min_zoom_level") ?? "9"),
                thresholdZoomLevel = parseInt(getConfig("threshold_zoom_level") ?? "14");
            if (debug) console.debug("Initializing source & color controls", { minZoomLevel, thresholdZoomLevel });

            const colorControl = new EtymologyColorControl(
                getCorrectFragmentParams().colorScheme,
                (colorSchemeID) => {
                    if (debug) console.debug("initWikidataControls set colorScheme", { colorSchemeID });
                    const params = getCorrectFragmentParams();
                    if (params.colorScheme != colorSchemeID) {
                        setFragmentParams(undefined, undefined, undefined, colorSchemeID, undefined);
                        this.updateDataSource();
                    }
                },
                (color) => {
                    if (debug) console.debug("initWikidataControls set layer color", { color });
                    [
                        ["wikidata_source_layer_point", "circle-color"],
                        ["wikidata_source_layer_lineString", 'line-color'],
                        ["wikidata_source_layer_polygon_fill", 'fill-color'],
                        ["wikidata_source_layer_polygon_border", 'line-color'],
                    ].forEach(([layerID, property]) => {
                        if (this?.getLayer(layerID)) {
                            this.setPaintProperty(layerID, property, color);
                        } else {
                            console.warn("Layer does not exist, can't set property", { layerID, property, color });
                        }
                    });
                },
                t,
                WIKIDATA_SOURCE,
                thresholdZoomLevel
            );
            this.addControl(colorControl, 'top-left');
            colorControl.updateChart();

            const sourceControl = new SourceControl(
                getCorrectFragmentParams().source,
                this.updateDataSource.bind(this),
                t
            );
            this.addControl(sourceControl, 'top-left');

            this.addControl(new InfoControl(), 'top-left');

            /* Set up controls in the top RIGHT corner */
            this.addControl(new LinkControl(
                "https://upload.wikimedia.org/wikipedia/commons/c/c3/Overpass-turbo.svg",
                t("overpass_turbo_query", "Source OverpassQL query on Overpass Turbo"),
                [ELEMENTS_SOURCE, WIKIDATA_SOURCE],
                "overpass_query",
                "https://overpass-turbo.eu/?Q=",
                minZoomLevel
            ), 'top-right');

            this.addControl(new LinkControl(
                "https://upload.wikimedia.org/wikipedia/commons/1/1a/Wikidata_Query_Service_Favicon.svg",
                t("wdqs_query", "Source SPARQL query on Wikidata Query Service"),
                [ELEMENTS_SOURCE, WIKIDATA_SOURCE],
                "wikidata_query",
                "https://query.wikidata.org/#",
                minZoomLevel
            ), 'top-right');

            this.addControl(new DataTableControl(WIKIDATA_SOURCE, thresholdZoomLevel), 'top-right');
            this.addControl(new iDEditorControl(thresholdZoomLevel), 'top-right');
            this.addControl(new OsmWikidataMatcherControl(thresholdZoomLevel), 'top-right');

            if (getConfig("mapcomplete_theme"))
                this.addControl(new MapCompleteControl(thresholdZoomLevel), 'top-right');
        });
    }

    /**
     * Completes low-level details of one of the high zoom Wikidata layers
     * 
     * @see prepareWikidataLayers
     * @see https://docs.mapbox.com/mapbox-gl-js/example/polygon-popup-on-click/
     * @see https://docs.mapbox.com/mapbox-gl-js/example/popup-on-click/
     * @see https://docs.mapbox.com/mapbox-gl-js/api/markers/#popup
     */
    private initWikidataLayer(layerID: string) {
        // When a click event occurs on a feature in the states layer,
        // open a popup at the location of the click, with description
        // HTML from the click event's properties.
        // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:click
        this.on('click', layerID, this.onWikidataLayerClick);

        // Change the cursor to a pointer when
        // the mouse is over the states layer.
        // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:mouseenter
        this.on('mouseenter', layerID, () => this.getCanvas().style.cursor = 'pointer');

        // Change the cursor back to a pointer
        // when it leaves the states layer.
        // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:mouseleave
        this.on('mouseleave', layerID, () => this.getCanvas().style.cursor = '');
    }

    /**
     * Handle the click on an item of the wikidata layer
     * 
     * @see https://stackoverflow.com/a/50502455/2347196
     * @see https://maplibre.org/maplibre-gl-js-docs/example/popup-on-click/
     * @see https://docs.mapbox.com/mapbox-gl-js/example/popup-on-click/
     */
    private onWikidataLayerClick(ev: MapMouseEvent & { features?: GeoJSONFeature[] | undefined; popupAlreadyShown?: boolean | undefined }) {
        if (ev.popupAlreadyShown) {
            if (debug) console.debug("onWikidataLayerClick: etymology popup already shown", ev);
        } else if (!ev.features) {
            console.warn("onWikidataLayerClick: missing or empty clicked features list", ev);
        } else {
            const feature = ev.features[0] as GeoJSONFeature,
                //popupPosition = e.lngLat,
                //popupPosition = this.getBounds().getNorthWest(),
                popupPosition = this.unproject([0, 0]),
                popup = new Popup({
                    closeButton: true,
                    closeOnClick: true,
                    closeOnMove: true,
                    maxWidth: "none",
                    className: "owmf_etymology_popup"
                })
                    .setLngLat(popupPosition)
                    //.setMaxWidth('95vw')
                    //.setOffset([10, 0])
                    //.setHTML(featureToHTML(e.features[0]));
                    .setHTML('<div class="detail_wrapper"><span class="element_loading"></span></div>')
                    .addTo(this),
                detail_wrapper = popup.getElement().querySelector<HTMLDivElement>(".detail_wrapper");
            if (debug) console.debug("onWikidataLayerClick: showing etymology popup", { ev, popup, detail_wrapper });
            if (!detail_wrapper)
                throw new Error("Failed adding the popup");

            const element_loading = document.createElement("span");
            element_loading.innerText = "Loading...";
            detail_wrapper.appendChild(element_loading);

            if (!feature)
                throw new Error("No feature available");
            detail_wrapper.appendChild(featureToDomElement(feature, this.getZoom()));

            element_loading.style.display = 'none';
            ev.popupAlreadyShown = true; // https://github.com/mapbox/mapbox-gl-js/issues/5783#issuecomment-511555713
            this.anyFeatureClickedBefore = true;
        }
    }

    private prepareElementsLayers(maxZoom: number) {
        this.prepareClusteredLayers(
            ELEMENTS_SOURCE,
            (layerName: string, e: MapMouseEvent) => {
                const feature = this.getClickedClusterFeature(layerName, e),
                    center = this.getClusterFeatureCenter(feature);
                this.easeTo({
                    center: center,
                    zoom: maxZoom ? maxZoom + 0.5 : 9
                });
            },
            "num",
            "num",
            undefined,
            maxZoom,
            "elements"
        );
    }

    private addOrUpdateGeoJSONSource(id: string, config: GeoJSONSourceSpecification): GeoJSONSource {
        if (this.getSource(WIKIDATA_SOURCE)?.type === "vector")
            this.removeSourceWithLayers(WIKIDATA_SOURCE);

        let sourceObject = this.getSource(id) as GeoJSONSource | undefined;
        const newSourceDataURL = ["string", "object"].includes(typeof config.data) ? config.data as string | GeoJSON : null,
            oldSourceDataURL = (sourceObject as any)?._data,
            sourceUrlChanged = !!newSourceDataURL && !!oldSourceDataURL && oldSourceDataURL !== newSourceDataURL;
        if (!!sourceObject && sourceUrlChanged) {
            showLoadingSpinner(true);
            if (debug) console.debug("addGeoJSONSource: updating source", { id, sourceObject, newSourceDataURL, oldSourceDataURL });
            sourceObject.setData(newSourceDataURL);
        } else if (!sourceObject) {
            if (debug) console.debug("addGeoJSONSource: adding source", { id, newSourceDataURL });
            showLoadingSpinner(true);
            this.addSource(id, config);
            sourceObject = this.getSource(id) as GeoJSONSource;
            if (!sourceObject) {
                console.error("addGeoJSONSource failed", { id, config, sourceObject })
                throw new Error("Failed adding source");
            } else if (debug) {
                console.info("addGeoJSONSource success ", { id, config, sourceObject });
            }
        } else if (debug) {
            console.info("Skipping source update", { id, newSourceDataURL });
        }
        return sourceObject;
    }

    /**
     * Initializes a generic clustered lset of layers:
     * - a source from the GeoJSON data in sourceDataURL with the 'cluster' option to true.
     * - a layer to show the clusters
     * - a layer to show the count labels on top of the clusters
     * - a layer for single points
     * 
     * @param prefix The prefix for the name of each layer
     * @param clusterProperties GL-JS will automatically add the point_count and point_count_abbreviated properties to each cluster. Other properties can be added with this option.
     * @param countFieldName The name of the field to be used as count
     * @param countShowFieldName The name of the field to be shown as count (the field value may be equal to the count or be a human-friendly version)
     * 
     * @see https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/#geojson
     * @see https://docs.mapbox.com/mapbox-gl-js/example/cluster/
     * @see https://github.com/mapbox/mapbox-gl-js/issues/2898
     */
    private prepareGeoJSONSourceAndClusteredLayers(
        sourceName: string,
        data: string | GeoJSON,
        minZoom: number | undefined,
        maxZoom: number | undefined,
        clusterProperties: object | undefined,
        countFieldName: string,
        countShowFieldName: string
    ) {
        const sourceObject = this.addOrUpdateGeoJSONSource(
            sourceName,
            {
                type: 'geojson',
                buffer: 256,
                data,
                cluster: true,
                maxzoom: maxZoom,
                //clusterMaxZoom: maxZoom, // Max zoom to cluster points on
                clusterRadius: 125, // Radius of each cluster when clustering points (defaults to 50)
                clusterProperties: clusterProperties,
                clusterMinPoints: 1
            }
        );

        this.prepareClusteredLayers(
            sourceName,
            (layerName: string, e: MapMouseEvent) => {
                const feature = this.getClickedClusterFeature(layerName, e),
                    clusterId = EtymologyMap.getClusterFeatureId(feature),
                    center = this.getClusterFeatureCenter(feature),
                    defaultZoom = maxZoom ? maxZoom + 0.5 : 9;
                sourceObject.getClusterExpansionZoom(
                    clusterId,
                    (err, zoom) => this.easeToClusterCenter(err, zoom || 1, defaultZoom, center)
                );
            },
            countFieldName,
            countShowFieldName,
            minZoom,
            maxZoom
        );
    }

    private prepareClusteredLayers(
        sourceName: string,
        onClusterClick: (layerName: string, e: MapMouseEvent) => void,
        countFieldName: string,
        countShowFieldName: string,
        minZoom?: number,
        maxZoom?: number,
        sourceLayer?: string
    ) {
        const clusterLayerName = sourceName + '_layer_cluster',
            countLayerName = sourceName + '_layer_count',
            pointLayerName = sourceName + '_layer_point';
        if (!this.getLayer(clusterLayerName)) {
            const minThreshold = 3_000,
                maxThreshold = 60_000,
                layerDefinition = {
                    id: clusterLayerName,
                    source: sourceName,
                    type: 'circle',
                    maxzoom: maxZoom || 15,
                    minzoom: minZoom || 0,
                    filter: ['has', countFieldName],
                    paint: {
                        // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
                        // with three steps to implement three types of circles:
                        'circle-color': [
                            'step', ['get', countFieldName],
                            '#51bbd6', minThreshold, // count < minThreshold => Blue circle
                            '#f1f075', maxThreshold, // minThreshold <= count < maxThreshold => Yellow circle
                            '#f28cb1' // count > maxThreshold => Pink circle
                        ],
                        'circle-opacity': 0.7,
                        'circle-radius': [
                            'interpolate', ['linear'],
                            ['get', countFieldName],
                            0, 15,
                            minThreshold, 30,
                            maxThreshold, 45,
                        ]
                    },
                } as CircleLayerSpecification;
            if (sourceLayer)
                layerDefinition["source-layer"] = sourceLayer;
            this.addLayer(layerDefinition);


            // inspect a cluster on click
            this.on('click', clusterLayerName, e => onClusterClick(clusterLayerName, e));

            this.on('mouseenter', clusterLayerName, () => this.getCanvas().style.cursor = 'pointer');
            this.on('mouseleave', clusterLayerName, () => this.getCanvas().style.cursor = '');

            if (debug) console.debug("prepareClusteredLayers cluster", {
                clusterLayerName, layerDefinition, layer: this.getLayer(clusterLayerName)
            });
        }

        if (!this.getLayer(countLayerName)) {
            const layerDefinition = {
                id: countLayerName,
                type: 'symbol',
                source: sourceName,
                maxzoom: maxZoom || 15,
                minzoom: minZoom || 0,
                filter: ['has', countShowFieldName],
                layout: {
                    'text-font': ["Open Sans Regular"],
                    'text-field': '{' + countShowFieldName + '}',
                    'text-size': 12
                }
            } as SymbolLayerSpecification;
            if (sourceLayer)
                layerDefinition["source-layer"] = sourceLayer;
            this.addLayer(layerDefinition);
            if (debug) console.debug("prepareClusteredLayers count", { countLayerName, layerDefinition, layer: this.getLayer(countLayerName) });
        }

        if (!this.getLayer(pointLayerName)) {
            const layerDefinition = {
                id: pointLayerName,
                type: 'circle',
                source: sourceName,
                maxzoom: maxZoom || 15,
                minzoom: minZoom || 0,
                filter: ['!', ['has', countFieldName]],
                paint: {
                    'circle-color': '#51bbd6',
                    'circle-opacity': 0.7,
                    'circle-radius': 15,
                    //'circle-stroke-width': 1,
                    //'circle-stroke-color': '#fff'
                }
            } as CircleLayerSpecification;
            if (sourceLayer)
                layerDefinition["source-layer"] = sourceLayer;
            this.addLayer(layerDefinition);

            this.on('click', pointLayerName, (e) => {
                const feature = this.getClickedClusterFeature(pointLayerName, e),
                    center = this.getClusterFeatureCenter(feature);
                this.easeTo({
                    center: center,
                    zoom: maxZoom ? maxZoom + 0.5 : 9
                });
            });

            this.on('mouseenter', pointLayerName, () => this.getCanvas().style.cursor = 'pointer');
            this.on('mouseleave', pointLayerName, () => this.getCanvas().style.cursor = '');

            if (debug) console.debug("prepareClusteredLayers point", {
                pointLayerName, layerDefinition, layer: this.getLayer(pointLayerName)
            });
        }
    }

    private getClickedClusterFeature(layerId: string, event: MapMouseEvent): GeoJSONFeature {
        const features = this.queryRenderedFeatures(event.point, { layers: [layerId] }),
            feature = features[0];
        if (!feature)
            throw new Error("No feature found in cluster click");
        return feature;
    }

    static getClusterFeatureId(feature: GeoJSONFeature): number {
        const clusterId = feature.properties?.cluster_id;
        if (typeof clusterId != 'number')
            throw new Error("No valid cluster ID found");
        return clusterId;
    }

    private getClusterFeatureCenter(feature: GeoJSONFeature): LngLatLike {
        return (feature.geometry as any).coordinates as LngLatLike;
    }

    /**
     * Callback for getClusterExpansionZoom which eases the map to the cluster center at the calculated zoom

    * @param defaultZoom Default zoom, in case the calculated one is empty (for some reason sometimes it happens)
    * 
    * @see https://docs.mapbox.com/mapbox-gl-js/api/sources/#geojsonsource#getclusterexpansionzoom
    * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map#easeto
    * @see https://docs.mapbox.com/mapbox-gl-js/api/properties/#cameraoptions
    */
    private easeToClusterCenter(err: any, zoom: number, defaultZoom: number, center: LngLatLike) {
        if (err) {
            logErrorMessage("easeToClusterCenter: Not easing because of an error", "error", err);
        } else {
            if (!zoom) {
                zoom = defaultZoom
                console.warn("easeToClusterCenter: Empty zoom, using default");
            }
            if (debug) console.debug("easeToClusterCenter", { zoom, center });
            this.easeTo({
                center: center,
                zoom: zoom
            });
        }
    }

    /**
     * Handles the dragging of a map
     */
    private mapMoveEndHandler() {
        this.updateDataForMapPosition();
    }

    private updateDataForMapPosition() {
        const lat = this.getCenter().lat,
            lon = this.getCenter().lng,
            zoom = this.getZoom();
        if (debug) console.debug("updateDataForMapPosition", { lat, lon, zoom });
        this.updateDataSource();
        setFragmentParams(lon, lat, zoom);
    }

    /**
     * 
     * @see https://maplibre.org/maplibre-gl-js-docs/example/geocoder/
     * @see https://github.com/maplibre/maplibre-gl-geocoder
     * @see https://github.com/maplibre/maplibre-gl-geocoder/blob/main/API.md
     * @see https://docs.mapbox.com/mapbox-gl-js/example/mapbox-gl-geocoder/
     */
    private setupGeocoder() {
        const maptiler_key = getConfig("maptiler_key");
        if (maptiler_key) {
            import(
                // webpackExports: ["GeocodingControl"]
                "@maptiler/geocoding-control/maplibregl"
            ).then(({ GeocodingControl }) => {
                const geocoderControl = new GeocodingControl({
                    apiKey: maptiler_key,
                    collapsed: true,
                    marker: false, // Markers require to pass maplibregl as argument
                });
                this.addControl(geocoderControl, 'bottom-left');

                document.addEventListener("keydown", (e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "f" && document.getElementsByClassName("owmf_data_table").length === 0) {
                        geocoderControl.focus();
                        e.preventDefault();
                    }
                });
            });
        }
    }

    /**
     * Handles the completion of map loading
     */
    private mapLoadedHandler() {
        this.on("style.load", this.mapStyleLoadHandler);

        this.updateDataForMapPosition();
        // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:idle
        //map.on('idle', updateDataSource); //! Called continuously, avoid
        // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:moveend
        this.on('moveend', this.mapMoveEndHandler);
        // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:zoomend
        //map.on('zoomend', updateDataSource); // moveend is sufficient

        this.setupGeocoder();

        // https://docs.mapbox.com/mapbox-gl-js/api/markers/#navigationcontrol
        this.addControl(new NavigationControl({
            visualizePitch: true
        }), 'top-right');

        // https://docs.mapbox.com/mapbox-gl-js/example/locate-user/
        // Add geolocate control to the map.
        this.addControl(new GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            // When active the map will receive updates to the device's location as it changes.
            trackUserLocation: false,
            // Draw an arrow next to the location dot to indicate which direction the device is heading.
            //showUserHeading: true
        }), 'top-right');

        // https://docs.mapbox.com/mapbox-gl-js/api/markers/#scalecontrol
        this.addControl(new ScaleControl({
            maxWidth: 80,
            unit: 'metric'
        }), 'bottom-left');

        this.addControl(new FullscreenControl(), 'top-right');
        this.addControl(new LanguageControl(), 'top-right');
        this.addControl(new BackgroundStyleControl(this.backgroundStyles, this.startBackgroundStyle.id), 'top-right');

        this.initWikidataControls();
    }

    /**
     * Initializes the low-zoom-level clustered layer.
     * 
     * @see prepareGeoJSONSourceAndClusteredLayers
     */
    private prepareGlobalLayers(maxZoom: number): void {
        const sourceID = getCorrectFragmentParams().source;
        this.lastSourceID = "global-" + sourceID;

        this.prepareGeoJSONSourceAndClusteredLayers(
            GLOBAL_SOURCE,
            './global-map.php',
            0,
            maxZoom,
            { "el_num": ["+", ["get", "num"]] },
            'el_num',
            'el_num'
        );

        // pmtiles vector source covers both very-low-zoom and medium-zoom levels
        // GeoJSON sources cover them separately
        if (this.getSource(ELEMENTS_SOURCE)?.type !== "geojson") {
            if (debug) console.debug("Initialized global GeoJSON source, removing vector/PMTiles elements source");
            this.removeSourceWithLayers(ELEMENTS_SOURCE);
        }
    }

    /**
     * Checks if a map symbol layer is also a name layer
     */
    private isNameSymbolLayer(layerId: string): boolean {
        /**
         * Checks recursively if any element in the array or in it sub-arrays is a string that starts with "name"
         */
        const someArrayItemStartWithName = (array: any): boolean => Array.isArray(array) && array.some(
            x => (typeof x === 'string' && x.startsWith('name')) || someArrayItemStartWithName(x)
        );

        const field = this.getLayoutProperty(layerId, 'text-field'),
            isSimpleName = field === '{name}' || (typeof field === "string" && field.startsWith('{name:latin}'));
        return isSimpleName || someArrayItemStartWithName(field);
    }

    /**
     * Set the application culture for i18n
     * 
     * Mainly, sets the map's query to get labels.
     * Mapbox vector tiles use the fields name_*.
     * MapTiler vector tiles use use the fields name:*.
     * 
     * @see https://documentation.maptiler.com/hc/en-us/articles/4405445343889-How-to-set-the-language-for-your-map
     * @see https://maplibre.org/maplibre-gl-js-docs/example/language-switch/
     * @see https://docs.mapbox.com/mapbox-gl-js/example/language-switch/
     * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map#setlayoutproperty
     */
    private setCulture() {
        const defaultLanguage = getConfig("default_language"),
            language = document.documentElement.lang.split('-').at(0),
            nameLayerIds = this.getStyle().layers
                .filter(layer => layer.type === 'symbol' && this.isNameSymbolLayer(layer.id))
                .map(layer => layer.id),
            newTextField = [
                'coalesce',
                ['get', 'name_' + language], // Main language name in Mapbox vector tiles
                ['get', 'name:' + language], // Main language name in MapTiler vector tiles
                ['get', 'name'],
                ['get', 'name_' + defaultLanguage], // Default language name in Mapbox vector tiles. Usually the name in the main language is in name=*, not in name_<main_language>=*, so using name_<default_launguage>=* before name=* would often hide the name in the main language
                ['get', 'name:' + defaultLanguage] // Default language name in MapTiler vector tiles. Usually the name in the main language is in name=*, not in name:<main_language>=*, so using name:<default_launguage>=* before name=* would often hide the name in the main language
            ];

        if (debug) console.debug("setCulture", {
            language,
            defaultLanguage,
            newTextField,
            nameLayerIds,
            oldTextFields: nameLayerIds.map(id => this.getLayoutProperty(id, 'text-field'))
        });
        nameLayerIds.forEach(id => this.setLayoutProperty(id, 'text-field', newTextField));
    }
}