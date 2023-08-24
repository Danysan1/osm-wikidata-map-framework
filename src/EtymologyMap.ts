import { Map, Popup, NavigationControl, GeolocateControl, ScaleControl, FullscreenControl, GeoJSONSource, GeoJSONSourceSpecification, LngLatLike, CircleLayerSpecification, SymbolLayerSpecification, MapMouseEvent, GeoJSONFeature, IControl, MapSourceDataEvent, MapDataEvent, RequestTransformFunction } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// import { Map, Popup, NavigationControl, GeolocateControl, ScaleControl, FullscreenControl, GeoJSONSource, GeoJSONSourceRaw as GeoJSONSourceSpecification, LngLatLike, CircleLayer as CircleLayerSpecification, SymbolLayer as SymbolLayerSpecification, MapMouseEvent, MapboxGeoJSONFeature as GeoJSONFeature, IControl, MapSourceDataEvent, MapDataEvent, TransformRequestFunction as RequestTransformFunction } from 'mapbox-gl';
// import 'mapbox-gl/dist/mapbox-gl.css';

import { logErrorMessage } from './monitoring';
import { getCorrectFragmentParams, setFragmentParams } from './fragment';
import { BackgroundStyle, BackgroundStyleControl } from './controls/BackgroundStyleControl';
import { EtymologyColorControl, getCurrentColorScheme } from './controls/EtymologyColorControl';
import { InfoControl, openInfoWindow } from './controls/InfoControl';
import { featureToDomElement } from "./FeatureElement";
import { showLoadingSpinner, showSnackbar } from './snackbar';
import { debugLog, getBoolConfig, getConfig } from './config';
import { SourceControl } from './controls/SourceControl';
import { GeoJSON, BBox } from 'geojson';
import { loadTranslator } from './i18n';
import { LinkControl } from './controls/LinkControl';
import './style.css';
import { WikidataMapService } from './services/WikidataMapService';
import { OverpassService } from './services/OverpassService';
import { OverpassWikidataMapService } from './services/OverpassWikidataMapService';
import { MapDatabase } from './db/MapDatabase';

const defaultBackgroundStyle = new URLSearchParams(window.location.search).get("style") || getConfig("default_background_style") || 'mapbox_streets',
    WIKIDATA_SOURCE = "wikidata_source",
    ELEMENTS_SOURCE = "elements_source",
    GLOBAL_SOURCE = "global_source";

export class EtymologyMap extends Map {
    private backgroundStyles: BackgroundStyle[];
    private startBackgroundStyle: BackgroundStyle;
    private geocoderControl?: IControl;
    private projectionControl?: IControl;
    private search: string;
    private anyDetailShownBefore = false;
    private wikidataControlsInitialized = false;
    private wikidataSourceInitialized = false;
    private wikidataMapService: WikidataMapService;
    private overpassService: OverpassService;
    private overpassWikidataService: OverpassWikidataMapService;
    private lastSource?: string;
    private lastBBox?: BBox;

    constructor(
        containerId: string,
        backgroundStyles: BackgroundStyle[],
        geocoderControl?: IControl,
        projectionControl?: IControl,
        requestTransformFunc?: RequestTransformFunction
    ) {
        let backgroundStyleObj = backgroundStyles.find(style => style.id == defaultBackgroundStyle);
        if (!backgroundStyleObj) {
            logErrorMessage("Invalid default background style", "error", { defaultBackgroundStyle });
            backgroundStyleObj = backgroundStyles[0];
        }
        const startParams = getCorrectFragmentParams();
        debugLog("Instantiating map", { containerId, backgroundStyleObj, startParams });

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
        this.geocoderControl = geocoderControl;
        this.projectionControl = projectionControl;
        const db = new MapDatabase();
        this.wikidataMapService = new WikidataMapService(db);
        this.overpassService = new OverpassService(db);
        this.overpassWikidataService = new OverpassWikidataMapService(this.overpassService, this.wikidataMapService);

        try {
            openInfoWindow(this);
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

        this.search = new URLSearchParams(window.location.search).get("search") ?? "";
    }

    /**
     * Handles the 'styledata' event
     * This event is executed very often, mupltiple times per base map change
     * However it's the only reliable event for intercepting base map changes
     * 
     * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:styledata
     * @see https://docs.mapbox.com/mapbox-gl-js/api/events/#mapdataevent
     */
    mapStyleDataHandler(e: MapDataEvent) {
        debugLog("mapStyleDataHandler", e);
        this.setCulture();
        this.updateDataSource();
    }

    /**
     * Handles the 'style.load' event
     * This event should handle the change of base map
     * It fires only one time but it's not reliable
     * 
     * @see https://bl.ocks.org/ryanbaumann/7f9a353d0a1ae898ce4e30f336200483/96bea34be408290c161589dcebe26e8ccfa132d7
     * @see https://github.com/mapbox/mapbox-gl-js/issues/3979
     * @see https://github.com/mapbox/mapbox-gl-js/issues/7579
     */
    mapStyleLoadHandler() {
        // debugLog("mapStyleLoadHandler");
        // this.setCulture();
        // this.updateDataSource();
    }

    /**
     * Handles the change of the URL fragment
     */
    hashChangeHandler(/*e: HashChangeEvent*/) {
        const newParams = getCorrectFragmentParams(),
            currLat = this.getCenter().lat,
            currLon = this.getCenter().lng,
            currZoom = this.getZoom();
        debugLog("hashChangeHandler", { newParams, currLat, currLon, currZoom });

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

    /**
     * Event listener that fires when one of the map's sources loads or changes.
     * 
     * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:sourcedata
     * @see https://docs.mapbox.com/mapbox-gl-js/api/events/#mapdataevent
     */
    mapSourceDataHandler(e: MapSourceDataEvent) {
        const wikidataSourceEvent = e.dataType == "source" && e.sourceId == WIKIDATA_SOURCE,
            elementsSourceEvent = e.dataType == "source" && e.sourceId == ELEMENTS_SOURCE,
            globalSourceEvent = e.dataType == "source" && e.sourceId == GLOBAL_SOURCE,
            sourceDataLoaded = e.isSourceLoaded && (wikidataSourceEvent || elementsSourceEvent || globalSourceEvent);

        if (sourceDataLoaded) {
            debugLog("mapSourceDataHandler: data loaded", {
                sourceDataLoaded, wikidataSourceEvent, elementsSourceEvent, globalSourceEvent, e, source: e.sourceId
            });
            showLoadingSpinner(false);

            const wikidataFeatureCount = this.querySourceFeatures(WIKIDATA_SOURCE).length;
            loadTranslator().then(t => {
                if (!this.wikidataSourceInitialized)
                    this.wikidataSourceInitialized = true;
                else if (wikidataSourceEvent && wikidataFeatureCount === 0)
                    showSnackbar(t("snackbar.no_data_in_this_area"), "wheat", 3000);
                else if (wikidataSourceEvent && !this.anyDetailShownBefore)
                    showSnackbar(t("snackbar.data_loaded_instructions"), "lightgreen", 10000);
                else
                    showSnackbar(t("snackbar.data_loaded"), "lightgreen", 3000);

            });
        }
    }

    /**
     * 
     * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:error
     */
    mapErrorHandler(err: any) {
        showLoadingSpinner(false);

        let errorMessage;
        if ([GLOBAL_SOURCE, ELEMENTS_SOURCE, WIKIDATA_SOURCE].includes(err.sourceId) && err.error.status > 200) {
            loadTranslator().then(t => showSnackbar(t("snackbar.fetch_error")));
            errorMessage = "An error occurred while fetching " + err.sourceId;
        } else {
            loadTranslator().then(t => showSnackbar(t("snackbar.map_error")));
            errorMessage = "Map error: " + err.sourceId + " - " + err.error.message
        }
        logErrorMessage(errorMessage, "error", err);
    }

    /**
     * 
     * @see https://docs.mapbox.com/mapbox-gl-js/example/external-geojson/
     * @see https://docs.mapbox.com/mapbox-gl-js/example/geojson-polygon/
     */
    async updateDataSource() {
        const bounds = this.getBounds(),
            southWest = bounds.getSouthWest(),
            northEast = bounds.getNorthEast(),
            zoomLevel = this.getZoom(),
            fragmentParams = getCorrectFragmentParams(),
            source = fragmentParams.source,
            language = document.documentElement.lang,
            minZoomLevel = parseInt(getConfig("min_zoom_level") ?? "9"),
            thresholdZoomLevel = parseInt(getConfig("threshold_zoom_level") ?? "14"),
            enableWikidataLayers = zoomLevel >= thresholdZoomLevel,
            enableElementLayers = zoomLevel < thresholdZoomLevel && zoomLevel >= minZoomLevel,
            enableGlobalLayers = zoomLevel < minZoomLevel;
        debugLog("updateDataSource", {
            zoomLevel,
            minZoomLevel,
            thresholdZoomLevel,
            enableWikidataLayers,
            enableElementLayers,
            enableGlobalLayers,
            source,
            language,
            search: this.search,
        });

        if (enableGlobalLayers) {
            if (getBoolConfig("db_enable"))
                this.prepareGlobalLayers(minZoomLevel);
            else
                loadTranslator().then(t => showSnackbar(t("snackbar.zoom_in"), "wheat", 15_000));
        } else if (enableElementLayers || enableWikidataLayers) {
            let minLat: number, minLon: number, maxLat: number, maxLon: number;
            if (enableWikidataLayers) {
                minLat = Math.floor(southWest.lat * 100) / 100; // 0.123 => 0.12
                minLon = Math.floor(southWest.lng * 100) / 100;
                maxLat = Math.ceil(northEast.lat * 100) / 100; // 0.123 => 0.13
                maxLon = Math.ceil(northEast.lng * 100) / 100;
            } else {
                minLat = Math.floor(southWest.lat * 10) / 10; // 0.123 => 0.1
                minLon = Math.floor(southWest.lng * 10) / 10;
                maxLat = Math.ceil(northEast.lat * 10) / 10; // 0.123 => 0.2
                maxLon = Math.ceil(northEast.lng * 10) / 10;
            }
            const bbox: BBox = [minLon, minLat, maxLon, maxLat];
            if (this.lastSource === source && this.lastBBox?.join(",") === bbox.join(",")) {
                debugLog("updateDataSource: skipping source update", { source, bbox });
                return;
            } else {
                this.lastSource = source;
                this.lastBBox = bbox;
            }

            const queryParams = {
                language,
                minLat: minLat.toString(),
                minLon: minLon.toString(),
                maxLat: maxLat.toString(),
                maxLon: maxLon.toString(),
                source,
                search: this.search
            },
                queryString = new URLSearchParams(queryParams).toString();

            let data: GeoJSON | undefined;
            try {
                if (this.wikidataMapService.canHandleSource(source))
                    data = await this.wikidataMapService.fetchMapData(source, bbox);
                else if (enableElementLayers && this.overpassService.canHandleSource(source))
                    data = await this.overpassService.fetchMapClusterElements(source, bbox);
                else if (enableWikidataLayers && this.overpassService.canHandleSource(source))
                    data = await this.overpassService.fetchMapElementDetails(source, bbox);
                else if (enableElementLayers && this.overpassWikidataService.canHandleSource(source))
                    data = await this.overpassWikidataService.fetchMapClusterElements(source, bbox);
                else if (enableWikidataLayers && this.overpassWikidataService.canHandleSource(source))
                    data = await this.overpassWikidataService.fetchMapElementDetails(source, bbox);
            } catch (e) {
                logErrorMessage("Error fetching map data", "error", { source, bbox, e });
            }

            if (enableWikidataLayers)
                this.prepareWikidataLayers(data || "./etymologyMap.php?" + queryString, thresholdZoomLevel);
            else
                this.prepareElementsLayers(data || "./elements.php?" + queryString, minZoomLevel, thresholdZoomLevel);
        } else {
            logErrorMessage("No layer was enabled", "error", {
                zoomLevel,
                minZoomLevel,
                thresholdZoomLevel,
            });
        }
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
    prepareWikidataLayers(data: string | GeoJSON, minZoom: number) {
        this.initWikidataControls();

        const colorSchemeColor = getCurrentColorScheme().color || '#223b53',
            wikidata_layer_point = WIKIDATA_SOURCE + '_layer_point',
            wikidata_layer_lineString = WIKIDATA_SOURCE + '_layer_lineString',
            wikidata_layer_polygon_border = WIKIDATA_SOURCE + '_layer_polygon_border',
            wikidata_layer_polygon_fill = WIKIDATA_SOURCE + '_layer_polygon_fill';

        this.addOrUpdateGeoJSONSource(
            WIKIDATA_SOURCE,
            {
                type: 'geojson',
                //buffer: 512, // This only works on already downloaded data
                data,
                attribution: 'Etymology: <a href="https://www.wikidata.org/wiki/Wikidata:Introduction">Wikidata</a>',
            }
        );

        if (!this.getLayer(wikidata_layer_point)) {
            this.addLayer({
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
            });
            this.initWikidataLayer(wikidata_layer_point);
        }

        if (!this.getLayer(wikidata_layer_lineString)) {
            this.addLayer({
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
            }, wikidata_layer_point);
            this.initWikidataLayer(wikidata_layer_lineString);
        }

        if (!this.getLayer(wikidata_layer_polygon_border)) {
            this.addLayer({ // https://github.com/mapbox/mapbox-gl-js/issues/3018#issuecomment-277117802
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
            }, wikidata_layer_lineString);
            this.initWikidataLayer(wikidata_layer_polygon_border);
        }

        if (!this.getLayer(wikidata_layer_polygon_fill)) {
            this.addLayer({
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
            }, wikidata_layer_polygon_border);
            this.initWikidataLayer(wikidata_layer_polygon_fill);
        }
    }

    initWikidataControls() {
        if (this.wikidataControlsInitialized)
            return;
        this.wikidataControlsInitialized = true;
        debugLog("Initializing Wikidata controls");
        loadTranslator().then(t => {
            const minZoomLevel = parseInt(getConfig("min_zoom_level") ?? "9"),
                thresholdZoomLevel = parseInt(getConfig("threshold_zoom_level") ?? "14");
            debugLog("Initializing source & color controls", { minZoomLevel, thresholdZoomLevel });
            const sourceControl = new SourceControl(
                getCorrectFragmentParams().source,
                this.updateDataSource.bind(this),
                t,
                minZoomLevel
            );
            setTimeout(() => this.addControl(sourceControl, 'top-left'), 25); // Delay needed to make sure the dropdown is always under the search bar

            const colorControl = new EtymologyColorControl(
                getCorrectFragmentParams().colorScheme,
                (colorSchemeID) => {
                    debugLog("initWikidataControls set colorScheme", { colorSchemeID });
                    const params = getCorrectFragmentParams();
                    if (params.colorScheme != colorSchemeID) {
                        setFragmentParams(undefined, undefined, undefined, colorSchemeID, undefined);
                        this.updateDataSource();
                    }
                },
                (color) => {
                    debugLog("initWikidataControls set color", { color });
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
            setTimeout(() => this.addControl(colorControl, 'top-left'), 50); // Delay needed to make sure the dropdown is always under the search bar

            debugLog("Initializing link controls", { minZoomLevel });
            this.addControl(new LinkControl(
                "https://upload.wikimedia.org/wikipedia/commons/c/c3/Overpass-turbo.svg", "Overpass Turbo", [ELEMENTS_SOURCE, WIKIDATA_SOURCE], "overpass_query", "https://overpass-turbo.eu/?Q=", minZoomLevel
            ), 'top-right');
            this.addControl(new LinkControl(
                "https://upload.wikimedia.org/wikipedia/commons/1/1a/Wikidata_Query_Service_Favicon.svg", "Wikidata Query Service", [ELEMENTS_SOURCE, WIKIDATA_SOURCE], "wikidata_query", "https://query.wikidata.org/#", minZoomLevel
            ), 'top-right');
        });
    }

    /**
     * Completes low-level details of the high zoom Wikidata layer
     * 
     * @see prepareWikidataLayers
     * @see https://docs.mapbox.com/mapbox-gl-js/example/polygon-popup-on-click/
     * @see https://docs.mapbox.com/mapbox-gl-js/example/popup-on-click/
     * @see https://docs.mapbox.com/mapbox-gl-js/api/markers/#popup
     */
    initWikidataLayer(layerID: string) {
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
    onWikidataLayerClick(ev: MapMouseEvent & { features?: GeoJSONFeature[] | undefined; popupAlreadyShown?: boolean | undefined }) {
        if (ev.popupAlreadyShown) {
            debugLog("onWikidataLayerClick: etymology popup already shown", ev);
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
            debugLog("onWikidataLayerClick: showing etymology popup", { ev, popup, detail_wrapper });
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
            this.anyDetailShownBefore = true;
        }
    }

    /**
     * Initializes the mid-zoom-level clustered layer.
     * 
     * @see prepareClusteredLayers
     */
    prepareElementsLayers(data: string | GeoJSON, minZoom: number, maxZoom: number) {
        this.initWikidataControls();
        this.prepareClusteredLayers(
            ELEMENTS_SOURCE,
            data,
            minZoom,
            maxZoom
        );
    }

    addOrUpdateGeoJSONSource(id: string, config: GeoJSONSourceSpecification): GeoJSONSource {
        let sourceObject = this.getSource(id) as GeoJSONSource | null;
        const newSourceDataURL = ["string", "object"].includes(typeof config.data) ? config.data as string | GeoJSON : null,
            oldSourceDataURL = (sourceObject as any)?._data,
            sourceUrlChanged = !!newSourceDataURL && !!oldSourceDataURL && oldSourceDataURL !== newSourceDataURL;
        if (!!sourceObject && sourceUrlChanged) {
            showLoadingSpinner(true);
            debugLog("addGeoJSONSource: updating source", { id, sourceObject, newSourceDataURL, oldSourceDataURL });
            sourceObject.setData(newSourceDataURL);
        } else if (!sourceObject) {
            debugLog("addGeoJSONSource: adding source", { id, newSourceDataURL });
            showLoadingSpinner(true);
            this.addSource(id, config);
            sourceObject = this.getSource(id) as GeoJSONSource;
            if (sourceObject)
                debugLog("addGeoJSONSource success ", { id, config, sourceObject });
            else {
                console.error("addGeoJSONSource failed", { id, config, sourceObject })
                throw new Error("Failed adding source");
            }
        } else {
            debugLog("Skipping source update", { id, newSourceDataURL });
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
    prepareClusteredLayers(
        sourceName: string,
        data: string | GeoJSON,
        minZoom: number | undefined = undefined,
        maxZoom: number | undefined = undefined,
        clusterProperties: object | undefined = undefined,
        countFieldName: string | undefined = 'point_count',
        countShowFieldName: string | undefined = 'point_count_abbreviated'
    ) {
        const clusterLayerName = sourceName + '_layer_cluster',
            countLayerName = sourceName + '_layer_count',
            pointLayerName = sourceName + '_layer_point',
            sourceObject = this.addOrUpdateGeoJSONSource(
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

        if (!this.getLayer(clusterLayerName)) {
            const minThreshold = 3000,
                maxThreshold = 40000,
                layerDefinition = {
                    id: clusterLayerName,
                    source: sourceName,
                    type: 'circle',
                    maxzoom: maxZoom,
                    minzoom: minZoom,
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
            this.addLayer(layerDefinition);


            // inspect a cluster on click
            this.on('click', clusterLayerName, (e) => {
                //
                const feature = this.getClickedClusterFeature(clusterLayerName, e),
                    clusterId = EtymologyMap.getClusterFeatureId(feature),
                    center = EtymologyMap.getClusterFeatureCenter(feature),
                    defaultZoom = maxZoom ? maxZoom + 0.5 : 9;
                sourceObject.getClusterExpansionZoom(
                    clusterId, (err, zoom) => this.easeToClusterCenter(err, zoom || 1, defaultZoom, center)
                );
            });

            this.on('mouseenter', clusterLayerName, () => this.getCanvas().style.cursor = 'pointer');
            this.on('mouseleave', clusterLayerName, () => this.getCanvas().style.cursor = '');

            debugLog("prepareClusteredLayers cluster", {
                clusterLayerName, layerDefinition, layer: this.getLayer(clusterLayerName)
            });
        }

        if (!this.getLayer(countLayerName)) {
            const layerDefinition = {
                id: countLayerName,
                type: 'symbol',
                source: sourceName,
                maxzoom: maxZoom,
                minzoom: minZoom,
                filter: ['has', countShowFieldName],
                layout: {
                    'text-font': ["Open Sans Regular"],
                    'text-field': '{' + countShowFieldName + '}',
                    'text-size': 12
                }
            } as SymbolLayerSpecification;
            this.addLayer(layerDefinition);
            debugLog("prepareClusteredLayers count", { countLayerName, layerDefinition, layer: this.getLayer(countLayerName) });
        }

        if (!this.getLayer(pointLayerName)) {
            const layerDefinition = {
                id: pointLayerName,
                type: 'circle',
                source: sourceName,
                maxzoom: maxZoom,
                minzoom: minZoom,
                filter: ['!', ['has', countFieldName]],
                paint: {
                    'circle-color': '#51bbd6',
                    'circle-opacity': 0.7,
                    'circle-radius': 15,
                    //'circle-stroke-width': 1,
                    //'circle-stroke-color': '#fff'
                }
            } as CircleLayerSpecification;
            this.addLayer(layerDefinition);

            this.on('click', pointLayerName, (e) => {
                const feature = this.getClickedClusterFeature(pointLayerName, e),
                    center = EtymologyMap.getClusterFeatureCenter(feature);
                this.easeTo({
                    center: center,
                    zoom: maxZoom ? maxZoom + 0.5 : 9
                });
            });

            this.on('mouseenter', pointLayerName, () => this.getCanvas().style.cursor = 'pointer');
            this.on('mouseleave', pointLayerName, () => this.getCanvas().style.cursor = '');

            debugLog("prepareClusteredLayers point", {
                pointLayerName, layerDefinition, layer: this.getLayer(pointLayerName)
            });
        }
    }

    getClickedClusterFeature(layerId: string, event: MapMouseEvent): GeoJSONFeature {
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

    static getClusterFeatureCenter(feature: GeoJSONFeature): LngLatLike {
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
    easeToClusterCenter(err: any, zoom: number, defaultZoom: number, center: LngLatLike) {
        if (err) {
            logErrorMessage("easeToClusterCenter: Not easing because of an error", "error", err);
        } else {
            if (!zoom) {
                zoom = defaultZoom
                console.warn("easeToClusterCenter: Empty zoom, using default");
            }
            debugLog("easeToClusterCenter", { zoom, center });
            this.easeTo({
                center: center,
                zoom: zoom
            });
        }
    }

    /**
     * Handles the dragging of a map
     */
    mapMoveEndHandler() {
        this.updateDataForMapPosition();
    }

    updateDataForMapPosition() {
        const lat = this.getCenter().lat,
            lon = this.getCenter().lng,
            zoom = this.getZoom();
        debugLog("updateDataForMapPosition", { lat, lon, zoom });
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
    setupGeocoder() {
        if (this.geocoderControl) {
            this.addControl(this.geocoderControl, 'top-left');
        }
    }

    /**
     * Handles the completion of map loading
     */
    mapLoadedHandler() {
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
        this.addControl(new BackgroundStyleControl(this.backgroundStyles, this.startBackgroundStyle.id), 'top-right');
        if (this.projectionControl)
            this.addControl(this.projectionControl, 'top-right');

        this.addControl(new InfoControl(), 'top-right');
    }

    /**
     * Initializes the low-zoom-level clustered layer.
     * 
     * @see prepareClusteredLayers
     */
    prepareGlobalLayers(maxZoom: number): void {
        this.prepareClusteredLayers(
            GLOBAL_SOURCE,
            './global-map.php',
            0,
            maxZoom,
            { "el_num": ["+", ["get", "num"]] },
            'el_num',
            'el_num'
        );
    }

    /**
     * Checks if a map symbol layer is also a name layer
     */
    isNameSymbolLayer(layerId: string): boolean {
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
    setCulture() {
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

        debugLog("setCulture", {
            language,
            defaultLanguage,
            newTextField,
            nameLayerIds,
            oldTextFields: nameLayerIds.map(id => this.getLayoutProperty(id, 'text-field'))
        });
        nameLayerIds.forEach(id => this.setLayoutProperty(id, 'text-field', newTextField));
    }
}