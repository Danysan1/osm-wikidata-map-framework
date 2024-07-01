import { Map, Popup, NavigationControl, GeolocateControl, ScaleControl, FullscreenControl, GeoJSONSource, GeoJSONSourceSpecification, LngLatLike, CircleLayerSpecification, SymbolLayerSpecification, MapMouseEvent, MapGeoJSONFeature, MapSourceDataEvent, RequestTransformFunction, VectorTileSource, LineLayerSpecification, FillExtrusionLayerSpecification, ExpressionSpecification, FilterSpecification, MapStyleDataEvent, Feature, DataDrivenPropertyValueSpecification, setRTLTextPlugin, addProtocol } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import "@maptiler/geocoding-control/style.css";
// import "maplibre-gl-inspect/dist/maplibre-gl-inspect.css";

import { logErrorMessage } from '../owmf-front-end/src/monitoring';
import { UrlFragment } from './UrlFragment';
import { InfoControl, openInfoWindow } from './controls/InfoControl';
import { showLoadingSpinner, showSnackbar } from '../owmf-front-end/src/snackbar';
import { getBoolConfig, getConfig, getFloatConfig } from './config';
import type { GeoJSON, BBox } from 'geojson';
import { getLanguage, loadTranslator } from './i18n';
import './style.css';
import { Protocol } from 'pmtiles';
import type { MapService } from './services/MapService';
import { ColorSchemeID, colorSchemes } from './model/colorScheme';
import type { BackgroundStyle } from './model/backgroundStyle';
import type { BackEndControl as BackEndControlType, EtymologyColorControl as EtymologyColorControlType, MapCompleteControl as MapCompleteControlType } from './controls';
import { fetchSourcePreset } from './services/PresetService';
import { SourcePreset } from './model/SourcePreset';

export class EtymologyMap extends Map {
    private backgroundStyles: BackgroundStyle[];
    private anyFeatureClickedBefore = false;
    private detailsSourceInitialized = false;
    private service?: MapService;
    private lastBackEndID?: string;
    private lastSourcePresetID?: string;
    private lastOnlyCentroids?: boolean;
    private lastKeyID?: string;
    private lastBBox?: BBox;
    private fetchInProgress = false;
    private shouldFetchAgain = false;
    private backEndControl?: BackEndControlType;
    private colorControl?: EtymologyColorControlType;
    private mapCompleteControl?: MapCompleteControlType;

    constructor(
        containerId: string,
        backgroundStyles: BackgroundStyle[],
        requestTransformFunc?: RequestTransformFunction
    ) {
        const startParams = fragment.getCorrectFragmentParams(),
            westLon = getFloatConfig("min_lon"),
            southLat = getFloatConfig("min_lat"),
            eastLon = getFloatConfig("max_lon"),
            northLat = getFloatConfig("max_lat");
        let backgroundStyleObj = backgroundStyles.find(style => style.id === startParams.backgroundStyleID);
        if (!backgroundStyleObj) {
            logErrorMessage("Invalid default background style", "error", { startParams, backgroundStyleObj });
            backgroundStyleObj = backgroundStyles[0];
            fragment.backgroundStyle = backgroundStyleObj.id;
        }
        if (process.env.NODE_ENV === 'development') console.debug("Instantiating map", { containerId, backgroundStyleObj, startParams, westLon, southLat, eastLon, northLat });

        super({
            container: containerId,
            style: backgroundStyleObj.styleUrl,
            center: [startParams.lon, startParams.lat], // starting position [lon, lat]
            zoom: startParams.zoom, // starting zoom
            maxBounds: westLon && southLat && eastLon && northLat ? [westLon, southLat, eastLon, northLat] : undefined,
            //projection: { name: 'mercator' },
            transformRequest: requestTransformFunc
        });
        this.backgroundStyles = backgroundStyles;
        this.updateSourcePreset().catch(console.error);

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
        this.addSecondaryControls().catch(console.error);

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

        // Set the map labels language (when a new background style is loaded label changes are lost)
        this.setCulture();

        // Make sure a preset is set and show the map data (when a new background style is loaded the previous data is lost)
        this.lastBackEndID = undefined;
        this.updateSourcePreset().then(this.updateDataSource.bind(this)).catch(console.error);
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
        const newParams = fragment.getCorrectFragmentParams(),
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
            import("./components/FeatureElement").then(({ featureToDomElement }) => {
                detail_wrapper.appendChild(featureToDomElement(feature, this.getZoom()));
            }).catch(e => logErrorMessage("Failed fetching FeatureElement", "error", { err: e }));

            element_loading.style.display = 'none';
            ev.popupAlreadyShown = true; // https://github.com/mapbox/mapbox-gl-js/issues/5783#issuecomment-511555713
            this.anyFeatureClickedBefore = true;
        }
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