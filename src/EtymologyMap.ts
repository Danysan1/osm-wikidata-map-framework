import { Map, Popup, NavigationControl, GeolocateControl, ScaleControl, FullscreenControl, GeoJSONSource, GeoJSONSourceSpecification, LngLatLike, CircleLayerSpecification, SymbolLayerSpecification, MapMouseEvent, MapGeoJSONFeature, MapSourceDataEvent, RequestTransformFunction, VectorTileSource, LineLayerSpecification, FillExtrusionLayerSpecification, ExpressionSpecification, FilterSpecification, MapStyleDataEvent, Feature, DataDrivenPropertyValueSpecification, setRTLTextPlugin, addProtocol } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import "@maptiler/geocoding-control/style.css";
// import "maplibre-gl-inspect/dist/maplibre-gl-inspect.css";

import { logErrorMessage } from './monitoring';
import { getCorrectFragmentParams, setFragmentParams } from './fragment';
import { InfoControl, openInfoWindow } from './controls/InfoControl';
import { showLoadingSpinner, showSnackbar } from './snackbar';
import { getBoolConfig, getConfig } from './config';
import type { GeoJSON, BBox } from 'geojson';
import { getLanguage, loadTranslator } from './i18n';
import './style.css';
import { Protocol } from 'pmtiles';
import type { MapService } from './services/MapService';
import { ColorSchemeID, colorSchemes } from './model/colorScheme';
import type { BackgroundStyle } from './model/backgroundStyle';
import type { EtymologyResponse } from './model/EtymologyResponse';

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

export class EtymologyMap extends Map {
    private backgroundStyles: BackgroundStyle[];
    private anyFeatureClickedBefore = false;
    private detailsSourceInitialized = false;
    private services?: MapService[];
    private lastBackEndID?: string;
    private lastKeyID?: string;
    private lastBBox?: BBox;
    private fetchInProgress = false;
    private shouldFetchAgain = false;

    constructor(
        containerId: string,
        backgroundStyles: BackgroundStyle[],
        requestTransformFunc?: RequestTransformFunction
    ) {
        const startParams = getCorrectFragmentParams();
        let backgroundStyleObj = backgroundStyles.find(style => style.id === startParams.backgroundStyleID);
        if (!backgroundStyleObj) {
            logErrorMessage("Invalid default background style", "error", { startParams, backgroundStyleObj });
            backgroundStyleObj = backgroundStyles[0];
            setFragmentParams(undefined, undefined, undefined, undefined, undefined, backgroundStyleObj.id);
        }
        if (process.env.NODE_ENV === 'development') console.debug("Instantiating map", { containerId, backgroundStyleObj, startParams });

        super({
            container: containerId,
            style: backgroundStyleObj.styleUrl,
            center: [startParams.lon, startParams.lat], // starting position [lon, lat]
            zoom: startParams.zoom, // starting zoom
            //projection: { name: 'mercator' },
            transformRequest: requestTransformFunc
        });
        this.backgroundStyles = backgroundStyles;
        void this.initServices();

        try {
            openInfoWindow(this, false);
        } catch (e) {
            console.error("Info window error:", e);
        }

        this.on('load', () => this.mapLoadedHandler());
        this.on('styledata', e => this.mapStyleDataHandler(e));
        this.on('sourcedata', e => this.mapSourceDataHandler(e));
        this.on('error', e => void this.mapErrorHandler(e));

        //this.dragRotate.disable(); // disable map rotation using right click + drag
        //this.touchZoomRotate.disableRotation(); // disable map rotation using touch rotation gesture

        window.addEventListener('hashchange', () => this.hashChangeHandler(), false);

        this.addBaseControls();
        void this.addSecondaryControls();

        // https://maplibre.org/maplibre-gl-js-docs/example/mapbox-gl-rtl-text/
        setRTLTextPlugin(
            'https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js',
            true // Lazy load the plugin
        ).then(() => {
            if (process.env.NODE_ENV === 'development') console.debug("mapbox-gl-rtl-text loaded");
        }).catch(
            err => console.error("Error loading mapbox-gl-rtl-text", err)
        );
    }

    private async initServices() {
        const qlever_enable = getBoolConfig("qlever_enable");
        try {
            const { WikidataMapService, OverpassService, OverpassWikidataMapService, QLeverMapService } = await import("./services"),
                overpassService = new OverpassService(),
                wikidataService = new WikidataMapService();
            this.services = [
                wikidataService,
                overpassService,
                new OverpassWikidataMapService(overpassService, wikidataService)
            ];
            if (qlever_enable)
                this.services.push(new QLeverMapService());
            if (process.env.NODE_ENV === 'development') console.debug("EtymologyMap: map services initialized", this.services);
        } catch (e) {
            logErrorMessage("Failed initializing map services", "error", { qlever_enable, error: e });
        }
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
    private mapStyleDataHandler(e: MapStyleDataEvent) {
        if (process.env.NODE_ENV === 'development') console.debug("mapStyleDataHandler", e);
        this.setCulture();
        this.lastBackEndID = undefined;
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
        // if (process.env.NODE_ENV === 'development') console.debug("mapStyleLoadHandler");
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
        if (process.env.NODE_ENV === 'development') console.debug("hashChangeHandler", { newParams, currLat, currLon, currZoom });

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
        if (process.env.NODE_ENV === 'development') console.debug("fetchCompleted", { shouldFetchAgain: this.shouldFetchAgain });
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

        const detailsSourceEvent = e.sourceId === DETAILS_SOURCE,
            elementsSourceEvent = e.sourceId === ELEMENTS_SOURCE;

        if (detailsSourceEvent || elementsSourceEvent) {
            if (process.env.NODE_ENV === 'development') console.debug("mapSourceDataHandler: data loaded", {
                detailsSourceEvent, elementsSourceEvent, e, source: e.sourceId
            });
            this.fetchCompleted();

            const noFeatures = detailsSourceEvent &&
                e.source.type === "geojson" && // Vector tile sources don't support querySourceFeatures()
                this.querySourceFeatures(DETAILS_SOURCE).length === 0;
            loadTranslator().then(t => {
                if (!this.detailsSourceInitialized)
                    this.detailsSourceInitialized = true;
                else if (noFeatures)
                    showSnackbar(t("snackbar.no_data_in_this_area", "No data in this area"), "wheat", 3000);
                else if (detailsSourceEvent && !this.anyFeatureClickedBefore)
                    showSnackbar(t("snackbar.data_loaded_instructions", "Data loaded, click on any highlighted element to show its details"), "lightgreen", 10000);
                else
                    showSnackbar(t("snackbar.data_loaded", "Data loaded"), "lightgreen", 3000);
            }).catch(
                () => showSnackbar("Data loaded", "lightgreen", 3000)
            );
        }
    }

    /**
     * 
     * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:error
     */
    private async mapErrorHandler(err: ErrorEvent & { sourceId?: string }) {
        let errorMessage;
        const t = await loadTranslator();
        if (err.sourceId && [ELEMENTS_SOURCE, DETAILS_SOURCE].includes(err.sourceId)) {
            this.fetchCompleted();
            showSnackbar(t("snackbar.fetch_error", "An error occurred while fetching the data"));
            errorMessage = "An error occurred while fetching " + err.sourceId;
        } else {
            showSnackbar(t("snackbar.map_error"));
            errorMessage = "Map error: " + err.sourceId
        }
        logErrorMessage(errorMessage, "error", { error: err });
    }

    private updateDataSource() {
        if (this.fetchInProgress) {
            this.shouldFetchAgain = true;
            if (process.env.NODE_ENV === 'development') console.debug("updateDataSource: Fetch already in progress, skipping source update");
            return;
        }

        const backEndID = getCorrectFragmentParams().backEndID,
            isPMTilesSource = backEndID.startsWith(PMTILES_PREFIX),
            minZoomLevel = parseInt(getConfig("min_zoom_level") ?? "9"),
            thresholdZoomLevel = parseInt(getConfig("threshold_zoom_level") ?? "14"),
            pmtilesBaseURL = getConfig("pmtiles_base_url");

        if (isPMTilesSource && backEndID === this.lastBackEndID) {
            if (process.env.NODE_ENV === 'development') console.debug("updateDataSource: PMTiles source unchanged, skipping source update");
        } else if (isPMTilesSource && !pmtilesBaseURL?.length) {
            void loadTranslator().then(t => showSnackbar(t("snackbar.map_error")));
            logErrorMessage("Requested to use pmtiles but no pmtiles base URL configured");
        } else if (isPMTilesSource) {
            this.lastBackEndID = backEndID;
            this.updateDetailsPMTilesSource(backEndID, thresholdZoomLevel);
        } else if (!this.services?.length) {
            if (process.env.NODE_ENV === 'development') console.warn("updateDataSource: Services are still initializing, skipping source update");
        } else {
            this.updateGeoJSONSource(backEndID, minZoomLevel, thresholdZoomLevel);
        }
    }

    private updateGeoJSONSource(backEndID: string, minZoomLevel: number, thresholdZoomLevel: number) {
        const bounds = this.getBounds(),
            southWest = bounds.getSouthWest(),
            northEast = bounds.getNorthEast(),
            zoomLevel = this.getZoom(),
            detailsMaxArea = parseFloat(getConfig("details_bbox_max_area") ?? "1"),
            elementsMaxArea = parseFloat(getConfig("elements_bbox_max_area") ?? "10"),
            area = (northEast.lat - southWest.lat) * (northEast.lng - southWest.lng),
            enableDetailsLayers = zoomLevel >= thresholdZoomLevel && area < detailsMaxArea,
            enableElementsLayers = !enableDetailsLayers && zoomLevel >= minZoomLevel && area < elementsMaxArea;
        if (process.env.NODE_ENV === 'development') console.debug("updateDataSource", {
            area, detailsMaxArea, elementsMaxArea, zoomLevel, minZoomLevel, thresholdZoomLevel, enableElementsLayers, enableDetailsLayers, backEndID
        });

        if (enableElementsLayers) {
            const fullBackEndID = "elements-" + backEndID,
                backEndChanged = this.lastBackEndID !== fullBackEndID,
                bbox: BBox = [
                    Math.floor(southWest.lng * 10) / 10, // 0.123 => 0.1
                    Math.floor(southWest.lat * 10) / 10,
                    Math.ceil(northEast.lng * 10) / 10, // 0.123 => 0.2
                    Math.ceil(northEast.lat * 10) / 10
                ];
            if (backEndChanged || this.isBBoxChanged(bbox)) {
                if (process.env.NODE_ENV === 'development') console.debug("Updating GeoJSON elements source:", backEndID);
                this.lastBackEndID = fullBackEndID;
                this.lastBBox = bbox;
                void this.updateElementsGeoJSONSource(backEndID, bbox, minZoomLevel, thresholdZoomLevel);
            }
        } else if (enableDetailsLayers) {
            const fullBackEndID = "details-" + backEndID,
                backEndChanged = this.lastBackEndID !== fullBackEndID,
                bbox: BBox = [
                    Math.floor(southWest.lng * 100) / 100, // 0.123 => 0.12
                    Math.floor(southWest.lat * 100) / 100,
                    Math.ceil(northEast.lng * 100) / 100, // 0.123 => 0.13
                    Math.ceil(northEast.lat * 100) / 100
                ];
            if (backEndChanged || this.isBBoxChanged(bbox)) {
                if (process.env.NODE_ENV === 'development') console.debug("Updating GeoJSON details source:", backEndID);
                this.lastBackEndID = fullBackEndID;
                this.lastBBox = bbox;
                void this.prepareDetailsGeoJSONSource(backEndID, bbox, thresholdZoomLevel);
            }
        } else {
            void loadTranslator().then(t => showSnackbar(t("snackbar.zoom_in", "Please zoom in to view data"), "wheat", 15_000));
            if (process.env.NODE_ENV === 'development') console.debug("updateDataSource: zoom level too low, skipping source update and removing layers");
            this.removeSourceWithLayers(DETAILS_SOURCE);
        }
    }

    private isBBoxChanged(bbox: BBox): boolean {
        const isBBoxChanged = !!this.lastBBox && (
            this.lastBBox[0] > bbox[0] ||
            this.lastBBox[1] > bbox[1] ||
            this.lastBBox[2] < bbox[2] ||
            this.lastBBox[3] < bbox[3]
        );
        if (process.env.NODE_ENV === 'development') console.debug("isBBoxChanged", isBBoxChanged, { lastBBox: this.lastBBox, bbox });
        return isBBoxChanged;
    }

    private async fetchMapClusterElements(backEndID: string, bbox: BBox): Promise<EtymologyResponse> {
        const service = this.services?.find(service => service.canHandleBackEnd(backEndID));
        if (!service)
            throw new Error("No service found for source ID " + backEndID);

        const { MapDatabase } = await import("./db/MapDatabase"),
            db = new MapDatabase(),
            cacheBackEndID = "elements-" + backEndID,
            lang = getLanguage();
        let out: EtymologyResponse | undefined = await db.getMap(cacheBackEndID, bbox, lang);
        if (out) {
            if (process.env.NODE_ENV === 'development') console.debug("Cache hit, using cached response", { cacheBackEndID, bbox, lang, out });
        } else {
            if (process.env.NODE_ENV === 'development') console.debug("Cache miss, fetching data", { cacheBackEndID, bbox, lang });
            out = await service.fetchMapClusterElements(cacheBackEndID, bbox, lang);
            void db.addMap(out);
        }
        return out;
    }

    private async updateElementsGeoJSONSource(backEndID: string, bbox: BBox, minZoomLevel: number, thresholdZoomLevel: number) {
        this.fetchInProgress = true;

        try {
            showLoadingSpinner(true);

            const data = await this.fetchMapClusterElements(backEndID, bbox);
            if (process.env.NODE_ENV === 'development') console.debug("updateElementsGeoJSONSource: data fetched, preparing layers", { backEndID, bbox, data, minZoomLevel, thresholdZoomLevel });

            this.removeSourceWithLayers(DETAILS_SOURCE);
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
            logErrorMessage("updateElementsGeoJSONSource: Error fetching map data", "error", { backEndID, bbox, e });
            void loadTranslator().then(t => showSnackbar(t("snackbar.fetch_error", "An error occurred while fetching the data")));
        } finally {
            this.fetchCompleted();
        }
    }

    private updateDetailsPMTilesSource(backEndID: string, thresholdZoomLevel: number) {
        if (process.env.NODE_ENV === 'development') console.debug("Updating pmtiles details source:", { backEndID, thresholdZoomLevel });

        this.removeSourceWithLayers(ELEMENTS_SOURCE);

        // The source max zoom must match the max zoom of the pmtiles file
        // See https://gis.stackexchange.com/a/330575/196469
        // See https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/airflow/dags/OwmfDbInitDAG.py?ref_type=heads#L740
        this.preparePMTilesSource(DETAILS_SOURCE, "etymology_map.pmtiles", 0, 12);

        const key_id = backEndID == "pmtiles_all" ? undefined : backEndID.replace("pmtiles_", "");
        this.prepareDetailsLayers(
            0, "etymology_map", key_id, thresholdZoomLevel
        );
    }

    private async fetchMapElementDetails(backEndID: string, bbox: BBox): Promise<EtymologyResponse> {
        const service = this.services?.find(service => service.canHandleBackEnd(backEndID));
        if (!service)
            throw new Error("No service found for source ID " + backEndID);

        const { MapDatabase } = await import("./db/MapDatabase"),
            db = new MapDatabase(),
            cacheBackEndID = "details-" + backEndID,
            lang = getLanguage();
        let out: EtymologyResponse | undefined = await db.getMap(cacheBackEndID, bbox, lang);
        if (out) {
            if (process.env.NODE_ENV === 'development') console.debug("Cache hit, using cached response", { cacheBackEndID, bbox, lang, out });
        } else {
            if (process.env.NODE_ENV === 'development') console.debug("Cache miss, fetching data", { cacheBackEndID, bbox, lang });
            out = await service.fetchMapElementDetails(cacheBackEndID, bbox, lang);
            void db.addMap(out);
        }
        return out;
    }

    private async prepareDetailsGeoJSONSource(backEndID: string, bbox: BBox, minZoom: number) {
        this.fetchInProgress = true;

        try {
            showLoadingSpinner(true);

            const data = await this.fetchMapElementDetails(backEndID, bbox);
            if (process.env.NODE_ENV === 'development') console.debug("prepareDetailsGeoJSONSource: data fetched, preparing layers", { backEndID, bbox, data, minZoom });

            this.removeSourceWithLayers(ELEMENTS_SOURCE);
            this.addOrUpdateGeoJSONSource(
                DETAILS_SOURCE,
                {
                    type: 'geojson',
                    // buffer: 512, // This only works on already downloaded data
                    data,
                    // attribution: 'Etymology: <a href="https://www.wikidata.org/wiki/Wikidata:Introduction">Wikidata</a>',
                }
            );
            this.prepareDetailsLayers(minZoom);
        } catch (e) {
            logErrorMessage("prepareWikidataGeoJSONSource: Error fetching map data", "error", { backEndID, bbox, e });
            void loadTranslator().then(t => showSnackbar(t("snackbar.fetch_error", "An error occurred while fetching the data")));
        } finally {
            this.fetchCompleted();
        }
    }

    /**
     * Prepares or updates the source for the layers from the PMTiles file.
     * 
     * @see https://docs.protomaps.com/
     * @see https://docs.protomaps.com/pmtiles/maplibre
     */
    private preparePMTilesSource(vectorSourceID: string, fileName: string, minZoom?: number, maxZoom?: number) {
        const pmtilesBaseURL = getConfig("pmtiles_base_url");
        if (!pmtilesBaseURL)
            throw new Error("Missing pmtiles URL");

        const oldSource = this.getSource(vectorSourceID),
            fullPMTilesURL = `pmtiles://${pmtilesBaseURL}${fileName}`;
        if (oldSource?.type === "vector") {
            const source = oldSource as VectorTileSource;
            if (!source.url) {
                if (process.env.NODE_ENV === 'development') console.debug("preparePMTilesSource: removing other vector tile source");
                this.removeSourceWithLayers(vectorSourceID);
            } else if (source.url !== fullPMTilesURL) { // PMTiles source already active
                if (process.env.NODE_ENV === 'development') console.debug("preparePMTilesSource: Updating source URL", { old: source.url, new: fullPMTilesURL });
                source.setUrl(fullPMTilesURL);
            }
        } else if (oldSource) { // GeoJSON source currently active
            if (process.env.NODE_ENV === 'development') console.debug("preparePMTilesSource: removing other GeoJSON source");
            this.removeSourceWithLayers(vectorSourceID);
        }

        if (!this.getSource(vectorSourceID)) {
            if (process.env.NODE_ENV === 'development') console.debug("preparePMTilesSource: Creating PMTiles source", { vectorSourceID, fullPMTilesURL, minZoom, maxZoom });

            const pmtilesProtocol = new Protocol();
            addProtocol("pmtiles", pmtilesProtocol.tile);

            this.addSource(vectorSourceID, {
                type: 'vector',
                url: fullPMTilesURL,
                maxzoom: maxZoom ?? 15,
                minzoom: minZoom ?? 0,
            });
        }
    }

    private removeSourceLayers(sourceID: string) {
        this.getLayersOrder()
            .filter(layerID => layerID.startsWith(sourceID))
            .forEach(layerID => this.removeLayer(layerID));
    }

    private removeSourceWithLayers(sourceID: string) {
        if (this.getSource(sourceID)) {
            this.removeSourceLayers(sourceID);
            this.removeSource(sourceID);
        }
    }

    /**
     * Initializes the high-zoom-level complete (un-clustered) layer.
     * 
     * @param minZoom The minimum zoom level at which the layers should be visible
     * @param source_layer The name of the source layer to use, in case the source is a vector tile source
     * @param key_id The key ID (ex: osm_name_etymology for OSM name:etymology:wikidata) to use for filtering the features
     * 
     * @see initWikidataLayer
     * @see https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/#geojson
     * @see https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/#geojson-attribution
     * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map#addlayer
     * @see https://docs.mapbox.com/mapbox-gl-js/example/geojson-layer-in-stack/
     */
    private prepareDetailsLayers(
        minZoom: number, source_layer?: string, key_id?: string, thresholdZoomLevel?: number
    ) {
        const createFilter = (geometryType: Feature["type"]) => {
            const out: FilterSpecification = ["all", ["==", ["geometry-type"], geometryType]];
            if (key_id)
                out.push(["in", key_id, ["get", "from_key_ids"]]);
            return out;
        }

        if (this.lastKeyID !== key_id) {
            if (process.env.NODE_ENV === 'development') console.debug("prepareDetailsLayers: key ID changed, removing old layers");
            this.removeSourceLayers(DETAILS_SOURCE);
        }
        this.lastKeyID = key_id;

        const lowZoomPointRadius = 2,
            midZoomPointRadius = 8,
            highZoomPointRadius = 16,
            pointFilter = createFilter("Point");
        if (!this.getLayer(DETAILS_SOURCE + POINT_TAP_AREA_LAYER)) {
            const spec: CircleLayerSpecification = {
                'id': DETAILS_SOURCE + POINT_TAP_AREA_LAYER,
                'source': DETAILS_SOURCE,
                'type': 'circle',
                "filter": pointFilter,
                "minzoom": thresholdZoomLevel ?? minZoom,
                'paint': {
                    'circle-color': '#ffffff',
                    'circle-opacity': 0,
                    'circle-radius': [
                        "interpolate", ["linear"], ["zoom"],
                        11, lowZoomPointRadius + 6,
                        16, midZoomPointRadius + 4,
                        21, highZoomPointRadius + 2,
                    ],
                }
            };
            if (source_layer)
                spec["source-layer"] = source_layer;
            if (process.env.NODE_ENV === 'development') console.debug("prepareDetailsLayers: Adding point tap area layer", spec);
            this.addLayer(spec); // Points are shown on top of lines and polygons
            this.initWikidataLayer(DETAILS_SOURCE + POINT_TAP_AREA_LAYER);
        }

        if (!this.getLayer(DETAILS_SOURCE + POINT_LAYER)) {
            const spec: CircleLayerSpecification = {
                'id': DETAILS_SOURCE + POINT_LAYER,
                'source': DETAILS_SOURCE,
                'type': 'circle',
                "filter": pointFilter,
                "minzoom": thresholdZoomLevel ?? minZoom,
                'paint': {
                    'circle-color': colorSchemes.blue.color,
                    'circle-opacity': 0.8,
                    'circle-radius': [
                        "interpolate", ["linear"], ["zoom"],
                        11, lowZoomPointRadius,
                        16, midZoomPointRadius,
                        21, highZoomPointRadius,
                    ],
                    'circle-stroke-width': 1,
                    'circle-stroke-color': 'white'
                }
            };
            if (source_layer)
                spec["source-layer"] = source_layer;
            if (process.env.NODE_ENV === 'development') console.debug("prepareDetailsLayers: Adding point layer", spec);
            this.addLayer(spec); // Points are shown on top of lines and polygons
            //this.initWikidataLayer(DETAILS_SOURCE + POINT_LAYER); // The tap area layer handles all clicks and hovers
        }

        const lowZoomLineWidth = 2,
            midZoomLineWidth = 12,
            highZoomLineWidth = 32,
            lineStringFilter = createFilter("LineString");
        if (!this.getLayer(DETAILS_SOURCE + LINE_TAP_AREA_LAYER)) {
            const spec: LineLayerSpecification = {
                'id': DETAILS_SOURCE + LINE_TAP_AREA_LAYER,
                'source': DETAILS_SOURCE,
                'type': 'line',
                "filter": lineStringFilter,
                "minzoom": thresholdZoomLevel ?? minZoom,
                'paint': {
                    'line-color': '#ffffff',
                    'line-opacity': 0,
                    'line-width': [
                        "interpolate", ["linear"], ["zoom"],
                        11, lowZoomLineWidth + 6,
                        16, midZoomLineWidth + 4,
                        21, highZoomLineWidth + 2,
                    ],
                }
            };
            if (source_layer)
                spec["source-layer"] = source_layer;
            if (process.env.NODE_ENV === 'development') console.debug("prepareDetailsLayers: Adding line tap area layer", spec);
            this.addLayer(spec, DETAILS_SOURCE + POINT_LAYER); // Lines are shown below points but on top of polygons
            this.initWikidataLayer(DETAILS_SOURCE + LINE_TAP_AREA_LAYER);
        }

        if (!this.getLayer(DETAILS_SOURCE + LINE_LAYER)) {
            const spec: LineLayerSpecification = {
                'id': DETAILS_SOURCE + LINE_LAYER,
                'source': DETAILS_SOURCE,
                'type': 'line',
                "filter": lineStringFilter,
                "minzoom": thresholdZoomLevel ?? minZoom,
                'paint': {
                    'line-color': colorSchemes.blue.color,
                    'line-opacity': 0.6,
                    'line-width': [
                        "interpolate", ["linear"], ["zoom"],
                        11, lowZoomLineWidth,
                        16, midZoomLineWidth,
                        21, highZoomLineWidth,
                    ],
                }
            };
            if (source_layer)
                spec["source-layer"] = source_layer;
            if (process.env.NODE_ENV === 'development') console.debug("prepareDetailsLayers: Adding line layer", spec);
            this.addLayer(spec, DETAILS_SOURCE + POINT_LAYER); // Lines are shown below points but on top of polygons
            // this.initWikidataLayer(DETAILS_SOURCE + LINE_LAYER); // The tap area layer handles all clicks and hovers
        }

        const polygonFilter = createFilter("Polygon");
        let lineWidth: DataDrivenPropertyValueSpecification<number>,
            lineOffest: DataDrivenPropertyValueSpecification<number>;
        if (thresholdZoomLevel !== undefined) {
            if (process.env.NODE_ENV === "development" && (
                COUNTRY_MAX_ZOOM < minZoom || STATE_MAX_ZOOM < minZoom || PROVINCE_MAX_ZOOM < minZoom || thresholdZoomLevel < PROVINCE_MAX_ZOOM
            )) {
                console.warn("prepareDetailsLayers: the zoom level setup doesn't make sense", { minZoom, COUNTRY_MAX_ZOOM, STATE_MAX_ZOOM, PROVINCE_MAX_ZOOM, thresholdZoomLevel });
            }

            polygonFilter.push(["case",
                ["all", ["has", "admin_level"], ["<=", ["to-number", ["get", "admin_level"]], COUNTRY_ADMIN_LEVEL]], ["<", ["zoom"], COUNTRY_MAX_ZOOM], // Show country boundaries only below COUNTRY_MAX_ZOOM
                ["all", ["has", "admin_level"], ["<=", ["to-number", ["get", "admin_level"]], STATE_ADMIN_LEVEL]], ["all", [">=", ["zoom"], COUNTRY_MAX_ZOOM], ["<", ["zoom"], STATE_MAX_ZOOM]], // Show state boundaries only between COUNTRY_MAX_ZOOM and STATE_MAX_ZOOM
                ["all", ["has", "admin_level"], ["<=", ["to-number", ["get", "admin_level"]], PROVINCE_ADMIN_LEVEL]], ["all", [">=", ["zoom"], STATE_MAX_ZOOM], ["<", ["zoom"], PROVINCE_MAX_ZOOM]], // Show province boundaries only between STATE_MAX_ZOOM and PROVINCE_MAX_ZOOM
                ["to-boolean", ["get", "boundary"]], ["all", [">=", ["zoom"], PROVINCE_MAX_ZOOM], ["<", ["zoom"], thresholdZoomLevel]], // Show city boundaries only between PROVINCE_MAX_ZOOM and thresholdZoomLevel
                [">=", ["zoom"], thresholdZoomLevel], // Show non-boundaries only above thresholdZoomLevel
            ]);
            if (process.env.NODE_ENV === 'development') console.debug("prepareDetailsLayers: added boundary filter", { minZoom, COUNTRY_MAX_ZOOM, PROVINCE_MAX_ZOOM, thresholdZoomLevel });

            lineWidth = ["step", ["zoom"], POLYGON_BORDER_LOW_ZOOM_WIDTH, thresholdZoomLevel, POLYGON_BORDER_HIGH_ZOOM_WIDTH];
            lineOffest = ["step", ["zoom"], POLYGON_BORDER_LOW_ZOOM_WIDTH / 2, thresholdZoomLevel, POLYGON_BORDER_HIGH_ZOOM_WIDTH / 2];
        } else {
            lineWidth = POLYGON_BORDER_HIGH_ZOOM_WIDTH;
            lineOffest = POLYGON_BORDER_HIGH_ZOOM_WIDTH / 2;
        }
        if (!this.getLayer(DETAILS_SOURCE + POLYGON_BORDER_LAYER)) {
            const spec: LineLayerSpecification = {
                'id': DETAILS_SOURCE + POLYGON_BORDER_LAYER,
                'source': DETAILS_SOURCE,
                'type': 'line',
                "filter": polygonFilter,
                "minzoom": minZoom,
                'paint': {
                    'line-color': colorSchemes.blue.color,
                    'line-opacity': 0.6,
                    'line-width': lineWidth,
                    'line-offset': lineOffest, // https://maplibre.org/maplibre-style-spec/layers/#paint-line-line-offset
                }
            };
            if (source_layer)
                spec["source-layer"] = source_layer;
            if (process.env.NODE_ENV === 'development') console.debug("prepareDetailsLayers: Adding polygon border layer", spec);
            this.addLayer(spec, DETAILS_SOURCE + LINE_LAYER); // Polygon borders are shown below lines and points but on top of polygon fill
            this.initWikidataLayer(DETAILS_SOURCE + POLYGON_BORDER_LAYER);
        }

        if (!this.getLayer(DETAILS_SOURCE + POLYGON_FILL_LAYER)) {
            const spec: FillExtrusionLayerSpecification = {
                'id': DETAILS_SOURCE + POLYGON_FILL_LAYER,
                'source': DETAILS_SOURCE,
                'type': 'fill-extrusion',
                "filter": polygonFilter,
                "minzoom": minZoom,
                'paint': { // https://maplibre.org/maplibre-gl-js/docs/examples/3d-buildings/
                    'fill-extrusion-color': colorSchemes.blue.color,
                    'fill-extrusion-opacity': 0.3,
                    'fill-extrusion-height': [
                        'interpolate', ['linear'], ['zoom'],
                        15, 0,
                        16, ['to-number', ['coalesce', ['get', 'render_height'], 0]]
                    ],
                }
            };
            if (source_layer)
                spec["source-layer"] = source_layer;
            if (process.env.NODE_ENV === 'development') console.debug("prepareDetailsLayers: Adding polygon fill layer", spec);
            this.addLayer(spec, DETAILS_SOURCE + POLYGON_BORDER_LAYER); // Polygon fill is shown below everything else
            this.initWikidataLayer(DETAILS_SOURCE + POLYGON_FILL_LAYER);
        }
    }

    private async addSecondaryControls() {
        if (process.env.NODE_ENV === 'development') console.debug("Initializing translated controls");

        const [
            t,
            { BackgroundStyleControl, DataTableControl, EtymologyColorControl, iDEditorControl, LanguageControl, LinkControl, MapCompleteControl, OsmWikidataMatcherControl, BackEndControl }
        ] = await Promise.all([
            loadTranslator(),
            import("./controls")
        ]);

        this.addControl(new LanguageControl(), 'top-right');
        this.addControl(new BackgroundStyleControl(this.backgroundStyles), 'top-right');

        const minZoomLevel = parseInt(getConfig("min_zoom_level") ?? "9"),
            thresholdZoomLevel = parseInt(getConfig("threshold_zoom_level") ?? "14");
        if (process.env.NODE_ENV === 'development') console.debug("Initializing source & color controls", { minZoomLevel, thresholdZoomLevel });

        const onColorSchemeChange = (colorSchemeID: ColorSchemeID) => {
            if (process.env.NODE_ENV === 'development') console.debug("initWikidataControls set colorScheme", { colorSchemeID });
            const params = getCorrectFragmentParams();
            if (params.colorScheme != colorSchemeID) {
                setFragmentParams(undefined, undefined, undefined, colorSchemeID, undefined);
                this.updateDataSource();
            }
        },
            setLayerColor = (color: string | ExpressionSpecification) => {
                if (process.env.NODE_ENV === 'development') console.debug("initWikidataControls set layer color", { color });
                [
                    [DETAILS_SOURCE + POINT_LAYER, "circle-color"],
                    [DETAILS_SOURCE + LINE_LAYER, 'line-color'],
                    [DETAILS_SOURCE + POLYGON_FILL_LAYER, 'fill-extrusion-color'],
                    [DETAILS_SOURCE + POLYGON_BORDER_LAYER, 'line-color'],
                ].forEach(([layerID, property]) => {
                    if (this?.getLayer(layerID)) {
                        this.setPaintProperty(layerID, property, color);
                    } else {
                        console.warn("Layer does not exist, can't set property", { layerID, property, color });
                    }
                });
            },
            colorControl = new EtymologyColorControl(
                getCorrectFragmentParams().colorScheme,
                onColorSchemeChange,
                setLayerColor,
                t,
                DETAILS_SOURCE,
                [DETAILS_SOURCE + POINT_LAYER, DETAILS_SOURCE + LINE_LAYER, DETAILS_SOURCE + POLYGON_BORDER_LAYER],
                0
            );
        this.addControl(colorControl, 'top-left');

        const backEndControl = new BackEndControl(
            getCorrectFragmentParams().backEndID,
            this.updateDataSource.bind(this),
            t
        );
        this.addControl(backEndControl, 'top-left');

        /* Set up controls in the top RIGHT corner */
        this.addControl(new LinkControl(
            "img/Overpass-turbo.svg",
            t("overpass_turbo_query", "Source OverpassQL query on Overpass Turbo"),
            [ELEMENTS_SOURCE, DETAILS_SOURCE],
            "overpass_query",
            "https://overpass-turbo.eu/?Q=",
            minZoomLevel
        ), 'top-right');

        this.addControl(new LinkControl(
            "img/Wikidata_Query_Service_Favicon.svg",
            t("wdqs_query", "Source SPARQL query on Wikidata Query Service"),
            [ELEMENTS_SOURCE, DETAILS_SOURCE],
            "wdqs_query",
            "https://query.wikidata.org/#",
            minZoomLevel
        ), 'top-right');

        if (getBoolConfig("qlever_enable")) {
            this.addControl(new LinkControl(
                "img/qlever.ico",
                t("qlever_query", "Source SPARQL query on QLever UI"),
                [ELEMENTS_SOURCE, DETAILS_SOURCE],
                "qlever_wd_query",
                "https://qlever.cs.uni-freiburg.de/wikidata/?query=",
                minZoomLevel
            ), 'top-right');

            this.addControl(new LinkControl(
                "img/qlever.ico",
                t("qlever_query", "Source SPARQL query on QLever UI"),
                [ELEMENTS_SOURCE, DETAILS_SOURCE],
                "qlever_osm_query",
                "https://qlever.cs.uni-freiburg.de/osm-planet/?query=",
                minZoomLevel
            ), 'top-right');
        }

        this.addControl(new DataTableControl(
            DETAILS_SOURCE,
            [DETAILS_SOURCE + POINT_LAYER, DETAILS_SOURCE + LINE_LAYER, DETAILS_SOURCE + POLYGON_FILL_LAYER],
            thresholdZoomLevel
        ), 'top-right');
        this.addControl(new iDEditorControl(thresholdZoomLevel), 'top-right');
        this.addControl(new OsmWikidataMatcherControl(thresholdZoomLevel), 'top-right');

        if (getConfig("mapcomplete_theme"))
            this.addControl(new MapCompleteControl(thresholdZoomLevel), 'top-right');

        /*if (process.env.NODE_ENV === 'development') {
            void import("maplibre-gl-inspect").then(MaplibreInspect => {
                this.addControl(new MaplibreInspect({
                    popup: new Popup({
                        closeButton: false,
                        closeOnClick: false
                    })
                }), 'bottom-right');
            });
        }*/
    }

    /**
     * Completes low-level common details of one of the high zoom Wikidata layers
     * - Handles clicks/taps on layer features
     * - Shows a hand pointing cursor when hovering over a layer feature
     * 
     * @see prepareDetailsLayers
     * @see https://docs.mapbox.com/mapbox-gl-js/example/polygon-popup-on-click/
     * @see https://docs.mapbox.com/mapbox-gl-js/example/popup-on-click/
     * @see https://docs.mapbox.com/mapbox-gl-js/api/markers/#popup
     */
    private initWikidataLayer(layerID: string) {
        // When a click event occurs on a feature in the states layer,
        // open a popup at the location of the click, with description
        // HTML from the click event's properties.
        // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:click
        this.on('click', layerID, (e) => this.onWikidataLayerClick(e));

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
    private onWikidataLayerClick(ev: MapMouseEvent & { features?: MapGeoJSONFeature[] | undefined; popupAlreadyShown?: boolean | undefined }) {
        if (ev.popupAlreadyShown) {
            if (process.env.NODE_ENV === 'development') console.debug("onWikidataLayerClick: etymology popup already shown", ev);
        } else if (!ev.features) {
            console.warn("onWikidataLayerClick: missing or empty clicked features list", ev);
        } else {
            const feature = ev.features[0],
                //popupPosition = e.lngLat,
                //popupPosition = this.getBounds().getNorthWest(),
                popupPosition = this.unproject([0, 0]),
                popup = new Popup({
                    closeButton: true,
                    closeOnClick: true,
                    closeOnMove: true,
                    maxWidth: "none",
                    className: "owmf_etymology_popup"
                }).setLngLat(popupPosition)
                    //.setMaxWidth('95vw')
                    //.setOffset([10, 0])
                    //.setHTML(featureToHTML(e.features[0]));
                    .setHTML('<div class="detail_wrapper"><span class="element_loading"></span></div>')
                    .addTo(this),
                detail_wrapper = popup.getElement().querySelector<HTMLDivElement>(".detail_wrapper");
            if (process.env.NODE_ENV === 'development') console.debug("onWikidataLayerClick: showing etymology popup", { ev, popup, detail_wrapper });
            if (!detail_wrapper)
                throw new Error("Failed adding the popup");

            const element_loading = document.createElement("span");
            element_loading.innerText = "Loading...";
            detail_wrapper.appendChild(element_loading);

            if (!feature)
                throw new Error("No feature available");
            void import("./components/FeatureElement").then(({ featureToDomElement }) => {
                detail_wrapper.appendChild(featureToDomElement(feature, this.getZoom()));
            });

            element_loading.style.display = 'none';
            ev.popupAlreadyShown = true; // https://github.com/mapbox/mapbox-gl-js/issues/5783#issuecomment-511555713
            this.anyFeatureClickedBefore = true;
        }
    }

    private addOrUpdateGeoJSONSource(id: string, config: GeoJSONSourceSpecification): GeoJSONSource {
        const rawSource = this.getSource(id);
        let sourceObject: GeoJSONSource | undefined;
        if (rawSource instanceof GeoJSONSource)
            sourceObject = rawSource;
        else
            this.removeSourceWithLayers(id);

        let newSourceDataURL: string | GeoJSON | undefined;
        if (typeof config.data === "string")
            newSourceDataURL = config.data;
        else if (config.data && typeof config.data === "object")
            newSourceDataURL = config.data;

        const oldSourceDataURL = sourceObject?._data,
            sourceUrlChanged = !!newSourceDataURL && !!oldSourceDataURL && oldSourceDataURL !== newSourceDataURL;
        if (sourceObject && newSourceDataURL && sourceUrlChanged) {
            showLoadingSpinner(true);
            if (process.env.NODE_ENV === 'development') console.debug("addGeoJSONSource: updating source", { id, sourceObject, newSourceDataURL, oldSourceDataURL });
            sourceObject.setData(newSourceDataURL);
        } else if (!sourceObject) {
            if (process.env.NODE_ENV === 'development') console.debug("addGeoJSONSource: adding source", { id, newSourceDataURL });
            showLoadingSpinner(true);
            this.addSource(id, config);
            sourceObject = this.getSource(id) as GeoJSONSource;
            if (!sourceObject) {
                console.error("addGeoJSONSource failed", { id, config, sourceObject })
                throw new Error("Failed adding source");
            } else if (process.env.NODE_ENV === 'development') {
                console.info("addGeoJSONSource success ", { id, config, sourceObject });
            }
        } else if (process.env.NODE_ENV === 'development') {
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
        this.addOrUpdateGeoJSONSource(
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
            countFieldName,
            countShowFieldName,
            minZoom,
            maxZoom
        );
    }

    private prepareClusteredLayers(
        sourceName: string,
        countFieldName: string,
        countShowFieldName: string,
        minZoom?: number,
        maxZoom?: number,
        sourceLayer?: string
    ) {
        const clusterLayerName = sourceName + CLUSTER_LAYER,
            countLayerName = sourceName + COUNT_LAYER,
            pointLayerName = sourceName + POINT_LAYER;
        if (!this.getLayer(clusterLayerName)) {
            const minThreshold = 3_000,
                maxThreshold = 60_000,
                layerDefinition: CircleLayerSpecification = {
                    id: clusterLayerName,
                    source: sourceName,
                    type: 'circle',
                    maxzoom: maxZoom ?? 15,
                    minzoom: minZoom ?? 0,
                    filter: ['has', countFieldName],
                    paint: {
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
                    },
                };
            if (sourceLayer)
                layerDefinition["source-layer"] = sourceLayer;
            this.addLayer(layerDefinition);


            // inspect a cluster on click
            this.on('click', clusterLayerName, e => this.onClusterClick(clusterLayerName, e));

            this.on('mouseenter', clusterLayerName, () => this.getCanvas().style.cursor = 'pointer');
            this.on('mouseleave', clusterLayerName, () => this.getCanvas().style.cursor = '');

            if (process.env.NODE_ENV === 'development') console.debug("prepareClusteredLayers cluster", {
                clusterLayerName, layerDefinition, layer: this.getLayer(clusterLayerName)
            });
        }

        if (!this.getLayer(countLayerName)) {
            const layerDefinition: SymbolLayerSpecification = {
                id: countLayerName,
                type: 'symbol',
                source: sourceName,
                maxzoom: maxZoom ?? 15,
                minzoom: minZoom ?? 0,
                filter: ['has', countShowFieldName],
                layout: {
                    'text-font': ["Open Sans Regular"],
                    'text-field': '{' + countShowFieldName + '}',
                    'text-size': 12
                }
            };
            if (sourceLayer)
                layerDefinition["source-layer"] = sourceLayer;
            this.addLayer(layerDefinition);
            if (process.env.NODE_ENV === 'development') console.debug("prepareClusteredLayers count", { countLayerName, layerDefinition, layer: this.getLayer(countLayerName) });
        }

        if (!this.getLayer(pointLayerName)) {
            const layerDefinition: CircleLayerSpecification = {
                id: pointLayerName,
                type: 'circle',
                source: sourceName,
                maxzoom: maxZoom ?? 15,
                minzoom: minZoom ?? 0,
                filter: ['!', ['has', countFieldName]],
                paint: {
                    'circle-color': '#51bbd6',
                    'circle-opacity': 0.8,
                    'circle-radius': 15,
                    //'circle-stroke-width': 1,
                    //'circle-stroke-color': '#fff'
                }
            };
            if (sourceLayer)
                layerDefinition["source-layer"] = sourceLayer;
            this.addLayer(layerDefinition);

            this.on('click', pointLayerName, e => this.onClusterClick(pointLayerName, e));

            this.on('mouseenter', pointLayerName, () => this.getCanvas().style.cursor = 'pointer');
            this.on('mouseleave', pointLayerName, () => this.getCanvas().style.cursor = '');

            if (process.env.NODE_ENV === 'development') console.debug("prepareClusteredLayers point", {
                pointLayerName, layerDefinition, layer: this.getLayer(pointLayerName)
            });
        }
    }

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
    private onClusterClick(layerName: string, e: MapMouseEvent) {
        const feature = this.getClickedClusterFeature(layerName, e);
        if (feature.geometry.type === "Point") {
            const center = feature.geometry.coordinates as LngLatLike;
            this.easeTo({
                center: center,
                zoom: this.getZoom() + 3
            });
        }
    }

    private getClickedClusterFeature(layerId: string, event: MapMouseEvent): MapGeoJSONFeature {
        const features = this.queryRenderedFeatures(event.point, { layers: [layerId] }),
            feature = features[0];
        if (!feature)
            throw new Error("No feature found in cluster click");
        return feature;
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
        if (process.env.NODE_ENV === 'development') console.debug("updateDataForMapPosition", { lat, lon, zoom });
        this.updateDataSource();
        setFragmentParams(lon, lat, zoom);
    }

    /**
     * Adds the geocoding control (from Maptiler if possible, Stadia Maps otherwise).
     * Listens for Ctrl/Cmd + F to focus the geocoder.
     * 
     * @see https://www.npmjs.com/package/@maptiler/geocoding-control
     * @see https://docs.stadiamaps.com/sdks/maplibre-gl-js-autocomplete-search-plugin/
     * @see https://maplibre.org/maplibre-gl-js-docs/example/geocoder/
     * @see https://github.com/maplibre/maplibre-gl-geocoder
     * @see https://docs.mapbox.com/mapbox-gl-js/example/mapbox-gl-geocoder/
     */
    private async setupGeocoder() {
        const maptiler_key = getConfig("maptiler_key");
        if (maptiler_key) {
            const { GeocodingControl } = await import("@maptiler/geocoding-control/maplibregl"),
                geocoderControl = new GeocodingControl({
                    apiKey: maptiler_key,
                    collapsed: true,
                    marker: false, // Markers require to pass maplibregl as argument
                });
            this.addControl(geocoderControl, 'bottom-left');
            const searchButton = document.querySelector<HTMLButtonElement>("div.maplibregl-ctrl-geocoder button.search-button");
            if (searchButton) {
                searchButton.ariaLabel = "Search";
                searchButton.title = "Search";
            }
            if (process.env.NODE_ENV === 'development') console.debug("setupGeocoder: added MapTiler geocoder control", geocoderControl);

            document.addEventListener("keydown", (e) => {
                if ((e.ctrlKey || e.metaKey) &&
                    e.key === "f" &&
                    document.getElementsByClassName("owmf_data_table").length === 0 &&
                    document.getElementsByClassName("detail_container").length === 0) {
                    geocoderControl.focus();
                    e.preventDefault();
                }
            });
        } else if (getBoolConfig("enable_stadia_maps")) {
            const { MapLibreSearchControl } = await import("@stadiamaps/maplibre-search-box"),
                geocoderControl = new MapLibreSearchControl({});
            if (process.env.NODE_ENV === 'development') console.debug("setupGeocoder: added Stadia geocoder control", geocoderControl);
            this.addControl(geocoderControl, 'bottom-left');
        }
    }

    /**
     * Handles the completion of map loading
     */
    private mapLoadedHandler() {
        this.on("style.load", () => this.mapStyleLoadHandler());

        try {
            this.updateDataForMapPosition();
        } catch (e) {
            logErrorMessage("mapLoadedHandler: Error initializing map", "error", { e });
        }

        // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:idle
        //map.on('idle', updateDataSource); //! Called continuously, avoid
        // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:moveend
        this.on('moveend', () => this.mapMoveEndHandler());
        // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:zoomend
        //map.on('zoomend', updateDataSource); // moveend is sufficient

        // this.addBaseControls(); // It should be done earlier
        // this.addSecondaryControls(); // It can be done earlier; done here would improve speed on devices with slow networks but would not be executed if initial source loading fails

        void this.setupGeocoder();
    }

    private addBaseControls() {
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

        this.addControl(new InfoControl(), 'top-left');
    }

    /**
     * Checks if a map symbol layer is also a name layer
     */
    private isNameSymbolLayer(layerId: string): boolean {
        /**
         * Checks recursively if any element in the array or in it sub-arrays is a string that starts with "name"
         */
        const someArrayItemStartWithName = (expression: unknown): boolean => Array.isArray(expression) && expression.some(
            x => (typeof x === 'string' && x.startsWith('name')) || someArrayItemStartWithName(x)
        );

        const labelExpression: unknown = this.getLayoutProperty(layerId, 'text-field'),
            isSimpleName = typeof labelExpression === "string" && labelExpression.startsWith('{name'); // "{name}" / "{name:en}" / "{name:latin}\n{name:nonlatin}" / ...
        return isSimpleName || someArrayItemStartWithName(labelExpression);
    }

    /**
     * Set the application culture for i18n
     * 
     * Mainly, sets the map's query to get labels.
     * OpenMapTiles (Stadia, MapTiler, ...) vector tiles use use the fields name:*.
     * Mapbox vector tiles use the fields name_*.
     * 
     * @see https://documentation.maptiler.com/hc/en-us/articles/4405445343889-How-to-set-the-language-for-your-map
     * @see https://maplibre.org/maplibre-gl-js-docs/example/language-switch/
     * @see https://docs.mapbox.com/mapbox-gl-js/example/language-switch/
     * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map#setlayoutproperty
     */
    private setCulture() {
        const defaultLanguage = getConfig("default_language"),
            language = getLanguage(),
            nameLayerIds = this.getStyle().layers
                .filter(layer => layer.type === 'symbol' && this.isNameSymbolLayer(layer.id))
                .map(layer => layer.id),
            newTextField = [
                'coalesce',
                ['get', 'name:' + language], // Main language name in OpenMapTiles vector tiles
                ['get', 'name_' + language], // Main language name in Mapbox vector tiles
                ['get', 'name'],
                ['get', 'name:' + defaultLanguage], // Default language name in OpenMapTiles vector tiles. Usually the name in the main language is in name=*, not in name:<main_language>=*, so using name:<default_launguage>=* before name=* would often hide the name in the main language
                ['get', 'name_' + defaultLanguage] // Default language name in Mapbox vector tiles. Usually the name in the main language is in name=*, not in name_<main_language>=*, so using name_<default_launguage>=* before name=* would often hide the name in the main language
            ];

        if (process.env.NODE_ENV === 'development') console.debug("setCulture", {
            language,
            defaultLanguage,
            newTextField,
            nameLayerIds,
            oldTextFields: nameLayerIds.map(id => this.getLayoutProperty(id, 'text-field') as unknown)
        });
        nameLayerIds.forEach(id => this.setLayoutProperty(id, 'text-field', newTextField));
    }
}