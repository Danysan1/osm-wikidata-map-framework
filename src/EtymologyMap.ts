//import { Map, Popup, NavigationControl, GeolocateControl, ScaleControl, FullscreenControl, GeoJSONSource, GeoJSONSourceRaw, LngLatLike, CircleLayer, SymbolLayer, MapMouseEvent, MaplibreGeoJSONFeature as MapGeoJSONFeature, CirclePaint, IControl, MapSourceDataEvent, MapDataEvent } from 'maplibre-gl';
import { Map, Popup, NavigationControl, GeolocateControl, ScaleControl, FullscreenControl, GeoJSONSource, GeoJSONSourceRaw, LngLatLike, CircleLayer, SymbolLayer, MapMouseEvent, MapboxGeoJSONFeature as MapGeoJSONFeature, CirclePaint, IControl, MapSourceDataEvent, MapDataEvent } from 'mapbox-gl';

//import 'maplibre-gl/dist/maplibre-gl.css';
import 'mapbox-gl/dist/mapbox-gl.css';

import { logErrorMessage } from './monitoring';
import { CorrectFragmentParams, getCorrectFragmentParams, setFragmentParams } from './fragment';
import { BackgroundStyle, BackgroundStyleControl } from './BackgroundStyleControl';
import { EtymologyColorControl, getCurrentColorScheme } from './EtymologyColorControl';
import { InfoControl, openInfoWindow } from './InfoControl';
import { featureToDomElement } from "./FeatureElement";
import { showLoadingSpinner, showSnackbar } from './snackbar';
import { debugLog, getConfig } from './config';
import './style.css';
import { SourceControl, SourceItem } from './SourceControl';

const thresholdZoomLevel_raw = getConfig("threshold_zoom_level"),
    minZoomLevel_raw = getConfig("min_zoom_level"),
    thresholdZoomLevel = thresholdZoomLevel_raw ? parseInt(thresholdZoomLevel_raw) : 14,
    minZoomLevel = minZoomLevel_raw ? parseInt(minZoomLevel_raw) : 9,
    defaultBackgroundStyle_raw = getConfig("default_background_style"),
    defaultBackgroundStyle = defaultBackgroundStyle_raw ? defaultBackgroundStyle_raw : 'mapbox_streets';

export class EtymologyMap extends Map {
    private backgroundStyles: BackgroundStyle[];
    private currentEtymologyColorControl?: EtymologyColorControl;
    private currentSourceControl?: SourceControl;
    private startBackgroundStyle: BackgroundStyle;
    private geocoderControl: IControl | null;
    private subject: string;

    constructor(
        containerId: string,
        backgroundStyles: BackgroundStyle[],
        startParams: CorrectFragmentParams,
        geocoderControl: IControl | null
    ) {
        let backgroundStyleObj = backgroundStyles.find(style => style.id == defaultBackgroundStyle);
        if (!backgroundStyleObj) {
            logErrorMessage("Invalid default background style", "error", { defaultBackgroundStyle });
            backgroundStyleObj = backgroundStyles[0];
        }

        super({
            container: containerId,
            style: backgroundStyleObj.styleUrl,
            center: [startParams.lon, startParams.lat], // starting position [lon, lat]
            zoom: startParams.zoom, // starting zoom
        });
        this.startBackgroundStyle = backgroundStyleObj;
        this.backgroundStyles = backgroundStyles;
        this.geocoderControl = geocoderControl;

        openInfoWindow(this);

        this.on('load', this.mapLoadedHandler);
        this.on('styledata', this.mapStyleDataHandler);

        //this.dragRotate.disable(); // disable map rotation using right click + drag
        //this.touchZoomRotate.disableRotation(); // disable map rotation using touch rotation gesture

        setFragmentParams(startParams.lon, startParams.lat, startParams.zoom, startParams.colorScheme);

        //eslint-disable-next-line
        const thisMap = this; // Needed to prevent overwriting of "this" in the window event handler ( https://stackoverflow.com/a/21299126/2347196 )
        window.addEventListener('hashchange', function () { thisMap.hashChangeHandler() }, false);

        this.subject = new URLSearchParams(window.location.search).get("subject") ?? "";
    }

    /**
     * 
     * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:styledata
     * @see https://docs.mapbox.com/mapbox-gl-js/api/events/#mapdataevent
     */
    mapStyleDataHandler(e: MapDataEvent) {
        debugLog("Map style data loaded", e);
        //setCulture(e.sender); //! Not here, this event is executed too often
    }

    /**
     * Handles the change of the URL fragment
     */
    hashChangeHandler(/*e: HashChangeEvent*/) {
        const newParams = getCorrectFragmentParams(),
            currLat = this.getCenter().lat,
            currLon = this.getCenter().lng,
            currZoom = this.getZoom(),
            colorControl = this.currentEtymologyColorControl;
        let currColorScheme: string | undefined;
        try {
            currColorScheme = colorControl?.getColorScheme();
        } catch (err) {
            console.error("Failed getting the current color scheme:", err);
            currColorScheme = undefined;
        }
        debugLog("hashChangeHandler", { newParams, currLat, currLon, currZoom, currColorScheme });

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

        if (currColorScheme != newParams.colorScheme)
            colorControl?.setColorScheme(newParams.colorScheme);
    }

    /**
     * Event listener that fires when one of the map's sources loads or changes.
     * 
     * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:sourcedata
     * @see https://docs.mapbox.com/mapbox-gl-js/api/events/#mapdataevent
     */
    mapSourceDataHandler(e: MapSourceDataEvent) {
        const wikidataSourceEvent = e.dataType == "source" && e.sourceId == "wikidata_source",
            elementsSourceEvent = e.dataType == "source" && e.sourceId == "elements_source",
            sourceDataLoaded = e.isSourceLoaded && (wikidataSourceEvent || elementsSourceEvent);

        if (sourceDataLoaded) {
            debugLog("mapSourceDataHandler: data loaded", {
                sourceDataLoaded, wikidataSourceEvent, elementsSourceEvent, e, source: e.sourceId
            });
            showLoadingSpinner(false);
            showSnackbar("Data loaded", "lightgreen");
            if (wikidataSourceEvent) {
                const source = this.currentSourceControl?.getCurrentID() ?? "all";
                this.currentEtymologyColorControl?.updateChart(e, source);
            }
        }
    }

    /**
     * 
     * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:error
     */
    mapErrorHandler(err: any) {
        let errorMessage;
        if (["elements_source", "wikidata_source"].includes(err.sourceId) && err.error.status > 200) {
            showLoadingSpinner(false);
            showSnackbar("An error occurred while fetching the data");
            errorMessage = "An error occurred while fetching " + err.sourceId;
        } else {
            showSnackbar("A map error occurred");
            errorMessage = "Map error: " + err.sourceId + " - " + err.error.message
        }
        logErrorMessage(errorMessage, "error", err);
    }

    /**
     * 
     * @see https://docs.mapbox.com/mapbox-gl-js/example/external-geojson/
     * @see https://docs.mapbox.com/mapbox-gl-js/example/geojson-polygon/
     */
    updateDataSource() {
        const bounds = this.getBounds(),
            bbox_margin = parseFloat(getConfig("bbox_margin") ?? "0"),
            southWest = bounds.getSouthWest(),
            minLat = southWest.lat - bbox_margin,
            minLon = southWest.lng - bbox_margin,
            northEast = bounds.getNorthEast(),
            maxLat = northEast.lat + bbox_margin,
            maxLon = northEast.lng + bbox_margin,
            zoomLevel = this.getZoom(),
            source = this.currentSourceControl?.getCurrentID() ?? "all",
            language = document.documentElement.lang,
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
            subject: this.subject,
        });

        if (enableWikidataLayers) {
            showLoadingSpinner(true);
            const queryParams = {
                from: "bbox",
                minLat: (Math.floor(minLat * 1000) / 1000).toString(), // 0.1234 => 0.124 
                minLon: (Math.floor(minLon * 1000) / 1000).toString(),
                maxLat: (Math.ceil(maxLat * 1000) / 1000).toString(), // 0.1234 => 0.123
                maxLon: (Math.ceil(maxLon * 1000) / 1000).toString(),
                language,
                source,
                subject: this.subject,
            },
                queryString = new URLSearchParams(queryParams).toString(),
                wikidata_url = './etymologyMap.php?' + queryString;

            this.prepareWikidataLayers(wikidata_url, thresholdZoomLevel);
        } else if (enableGlobalLayers) {
            this.prepareGlobalLayers(minZoomLevel);
        } else if (enableElementLayers) {
            showLoadingSpinner(true);
            const queryParams = {
                from: "bbox",
                onlyCenter: "1",
                minLat: (Math.floor(minLat * 10) / 10).toString(), // 0.1234 => 0.1
                minLon: (Math.floor(minLon * 10) / 10).toString(), // 0.1234 => 0.1
                maxLat: (Math.ceil(maxLat * 10) / 10).toString(), // 0.1234 => 0.2
                maxLon: (Math.ceil(maxLon * 10) / 10).toString(), // 0.1234 => 0.2
                language,
                source,
                subject: this.subject,
            },
                queryString = new URLSearchParams(queryParams).toString(),
                elements_url = './elements.php?' + queryString;

            this.prepareElementsLayers(elements_url, minZoomLevel, thresholdZoomLevel);
        } else {
            console.error("No layer was enabled", {
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
    prepareWikidataLayers(wikidata_url: string, minZoom: number) {
        const colorSchemeColor = getCurrentColorScheme().color,
            wikidata_source = "wikidata_source",
            wikidata_layer_point = 'wikidata_layer_point',
            wikidata_layer_lineString = 'wikidata_layer_lineString',
            wikidata_layer_polygon_border = 'wikidata_layer_polygon_border',
            wikidata_layer_polygon_fill = 'wikidata_layer_polygon_fill';

        this.addGeoJSONSource(
            wikidata_source,
            {
                type: 'geojson',
                //buffer: 512, // This only works on already downloaded data
                data: wikidata_url,
                attribution: 'Etymology: <a href="https://www.wikidata.org/wiki/Wikidata:Introduction">Wikidata</a>',
            },
            wikidata_url
        );

        if (!this.getLayer(wikidata_layer_point)) {
            this.addLayer({
                'id': wikidata_layer_point,
                'source': wikidata_source,
                'type': 'circle',
                "filter": ["==", ["geometry-type"], "Point"],
                "minzoom": minZoom,
                'paint': {
                    'circle-radius': 8,
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
                'source': wikidata_source,
                'type': 'line',
                "filter": ["==", ["geometry-type"], "LineString"],
                "minzoom": minZoom,
                'paint': {
                    'line-color': colorSchemeColor,
                    'line-opacity': 0.5,
                    'line-width': 12
                }
            }, wikidata_layer_point);
            this.initWikidataLayer(wikidata_layer_lineString);
        }

        if (!this.getLayer(wikidata_layer_polygon_border)) {
            this.addLayer({ // https://github.com/mapbox/mapbox-gl-js/issues/3018#issuecomment-277117802
                'id': wikidata_layer_polygon_border,
                'source': wikidata_source,
                'type': 'line',
                "filter": ["==", ["geometry-type"], "Polygon"],
                "minzoom": minZoom,
                'paint': {
                    'line-color': colorSchemeColor,
                    'line-opacity': 0.5,
                    'line-width': 8,
                    'line-offset': -3.5, // https://docs.mapbox.com/mapbox-gl-js/style-spec/layers/#paint-line-line-offset
                }
            }, wikidata_layer_lineString);
            this.initWikidataLayer(wikidata_layer_polygon_border);
        }

        if (!this.getLayer(wikidata_layer_polygon_fill)) {
            this.addLayer({
                'id': wikidata_layer_polygon_fill,
                'source': wikidata_source,
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

        this.initSourceControl();
        this.initEtymologyColorControl();
    }

    initSourceControl() {
        if (!this.currentSourceControl) {
            const sourceItems: SourceItem[] = [{ id: "overpass", text: "OSM (real time via Overpass API)" }];
            let defaultSource = "overpass";
            if (getConfig("db_enable") === "true") {
                sourceItems.push(
                    { id: "etymology", text: "OSM name:etymology:wikidata (from DB)" },
                    { id: "subject", text: "OSM subject:wikidata (from DB)" },
                    { id: "buried", text: "OSM buried:wikidata (from DB)" },
                    { id: "wikidata", text: "OSM + Wikidata P138/P547/P825 (from DB)" },
                    { id: "propagated", text: "Propagated (from DB)" },
                    { id: "all", text: "All sources from DB" },
                );
                defaultSource = "all";
            }
            const sourceControl = new SourceControl(
                sourceItems,
                this.updateDataSource.bind(this),
                defaultSource
            );
            this.currentSourceControl = sourceControl;
            setTimeout(() => this.addControl(sourceControl, 'top-left'), 50); // Delay needed to make sure the dropdown is always under the search bar
        }
    }

    initEtymologyColorControl() {
        if (!this.currentEtymologyColorControl) {
            const colorControl = new EtymologyColorControl(getCorrectFragmentParams().colorScheme);
            this.currentEtymologyColorControl = colorControl;
            setTimeout(() => this.addControl(colorControl, 'top-left'), 100); // Delay needed to make sure the dropdown is always under the search bar
        }
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
    onWikidataLayerClick(ev: MapMouseEvent & { features?: MapGeoJSONFeature[] | undefined; popupAlreadyShown?: boolean | undefined }) {
        if (ev.popupAlreadyShown) {
            debugLog("onWikidataLayerClick: etymology popup already shown", ev);
        } else if (!ev.features) {
            console.warn("onWikidataLayerClick: missing or empty clicked features list", ev);
        } else {
            const feature = ev.features[0] as MapGeoJSONFeature,
                //popupPosition = e.lngLat,
                //popupPosition = this.getBounds().getNorthWest(),
                popupPosition = this.unproject([0, 0]),
                popup = new Popup({
                    closeButton: true,
                    closeOnClick: true,
                    closeOnMove: true,
                    maxWidth: "none",
                    className: "oem_etymology_popup"
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
            detail_wrapper.appendChild(featureToDomElement(feature));

            element_loading.style.display = 'none';
            ev.popupAlreadyShown = true; // https://github.com/mapbox/mapbox-gl-js/issues/5783#issuecomment-511555713
        }
    }

    static clusterPaintFromField(field: string, minThreshold = 3000, maxThreshold = 40000): CirclePaint {
        return {
            // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
            // with three steps to implement three types of circles:
            'circle-color': [
                'step', ['get', field],
                '#51bbd6', minThreshold, // count < minThreshold => Blue circle
                '#f1f075', maxThreshold, // minThreshold <= count < maxThreshold => Yellow circle
                '#f28cb1' // count > maxThreshold => Pink circle
            ],
            'circle-opacity': 0.7,
            'circle-radius': [
                'interpolate', ['linear'],
                ['get', field],
                0, 15,
                minThreshold, 30,
                maxThreshold, 45,
            ]
        };
    }

    /**
     * Initializes the mid-zoom-level clustered layer.
     * 
     * @see prepareClusteredLayers
     */
    prepareElementsLayers(elements_url: string, minZoom: number, maxZoom: number) {
        this.prepareClusteredLayers(
            'elements',
            elements_url,
            minZoom,
            maxZoom
        );

        this.initSourceControl();
    }

    addGeoJSONSource(id: string, config: GeoJSONSourceRaw, sourceDataURL: string): GeoJSONSource {
        let sourceObject = this.getSource(id) as GeoJSONSource & { _data?: string | undefined } | null;
        const oldSourceDataURL = (sourceObject && sourceObject._data) ? sourceObject._data : null,
            sourceUrlChanged = oldSourceDataURL != sourceDataURL;
        if (!!sourceObject && sourceUrlChanged) {
            debugLog("prepareClusteredLayers: updating source", { id, sourceObject, sourceDataURL, oldSourceDataURL });
            sourceObject.setData(sourceDataURL);
        } else if (!sourceObject) {
            this.addSource(id, config);
            sourceObject = this.getSource(id) as GeoJSONSource;
            if (sourceObject)
                debugLog("addGeoJSONSource success ", { id, config, sourceObject });
            else {
                console.error("addGeoJSONSource failed", { id, config, sourceObject })
                throw new Error("Failed adding source");
            }
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
        prefix: string,
        sourceDataURL: string,
        minZoom: number | undefined = undefined,
        maxZoom: number | undefined = undefined,
        clusterProperties: object | undefined = undefined,
        countFieldName: string | undefined = 'point_count',
        countShowFieldName: string | undefined = 'point_count_abbreviated'
    ) {
        const sourceName = prefix + '_source',
            clusterLayerName = prefix + '_layer_cluster',
            countLayerName = prefix + '_layer_count',
            pointLayerName = prefix + '_layer_point',
            sourceObject = this.addGeoJSONSource(
                sourceName,
                {
                    type: 'geojson',
                    buffer: 256,
                    data: sourceDataURL,
                    cluster: true,
                    maxzoom: maxZoom,
                    //clusterMaxZoom: maxZoom, // Max zoom to cluster points on
                    clusterRadius: 125, // Radius of each cluster when clustering points (defaults to 50)
                    clusterProperties: clusterProperties,
                    clusterMinPoints: 1
                },
                sourceDataURL
            );

        if (!this.getLayer(clusterLayerName)) {
            const layerDefinition = {
                id: clusterLayerName,
                source: sourceName,
                type: 'circle',
                maxzoom: maxZoom,
                minzoom: minZoom,
                filter: ['has', countFieldName],
                paint: EtymologyMap.clusterPaintFromField(countFieldName),
            } as CircleLayer;
            this.addLayer(layerDefinition);


            // inspect a cluster on click
            this.on('click', clusterLayerName, (e) => {
                //
                const feature = this.getClickedClusterFeature(clusterLayerName, e),
                    clusterId = EtymologyMap.getClusterFeatureId(feature),
                    center = EtymologyMap.getClusterFeatureCenter(feature),
                    defaultZoom = maxZoom ? maxZoom + 0.5 : 9;
                sourceObject.getClusterExpansionZoom(
                    clusterId, (err, zoom) => this.easeToClusterCenter(err, zoom, defaultZoom, center)
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
                    'text-field': '{' + countShowFieldName + '}',
                    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                    'text-size': 12
                }
            } as SymbolLayer;
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
            } as CircleLayer;
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

    getClickedClusterFeature(layerId: string, event: MapMouseEvent): MapGeoJSONFeature {
        const features = this.queryRenderedFeatures(event.point, { layers: [layerId] }),
            feature = features[0];
        if (!feature)
            throw new Error("No feature found in cluster click");
        return feature;
    }

    static getClusterFeatureId(feature: MapGeoJSONFeature): number {
        const clusterId = feature.properties?.cluster_id;
        if (typeof clusterId != 'number')
            throw new Error("No valid cluster ID found");
        return clusterId;
    }

    static getClusterFeatureCenter(feature: MapGeoJSONFeature): LngLatLike {
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
        setFragmentParams(lon, lat, zoom, undefined);

        const colorSchemeContainer = document.getElementsByClassName("etymology-color-ctrl")[0];
        if (colorSchemeContainer) {
            if (zoom > thresholdZoomLevel)
                colorSchemeContainer.classList.remove("hiddenElement");
            else
                colorSchemeContainer.classList.add("hiddenElement");
        }
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
     * Handles the change of base map
     * 
     * @see https://bl.ocks.org/ryanbaumann/7f9a353d0a1ae898ce4e30f336200483/96bea34be408290c161589dcebe26e8ccfa132d7
     * @see https://github.com/mapbox/mapbox-gl-js/issues/3979
     */
    mapStyleLoadHandler() {
        this.setCulture();
        this.updateDataSource();
    }

    /**
     * Handles the completion of map loading
     */
    mapLoadedHandler() {
        this.setCulture();
        this.on("style.load", this.mapStyleLoadHandler)
        //openInfoWindow(map);

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
            showUserHeading: true
        }), 'top-right');

        // https://docs.mapbox.com/mapbox-gl-js/api/markers/#scalecontrol
        this.addControl(new ScaleControl({
            maxWidth: 80,
            unit: 'metric'
        }), 'bottom-left');
        this.addControl(new FullscreenControl(), 'top-right');
        this.addControl(new BackgroundStyleControl(this.backgroundStyles, this.startBackgroundStyle.id), 'top-right');

        this.addControl(new InfoControl(), 'top-right');

        this.on('sourcedata', this.mapSourceDataHandler);

        this.on('error', this.mapErrorHandler);
    }

    /**
     * Initializes the low-zoom-level clustered layer.
     * 
     * @see prepareClusteredLayers
     */
    prepareGlobalLayers(maxZoom: number): void {
        this.prepareClusteredLayers(
            'global',
            './global-map.php',
            0,
            maxZoom,
            { "el_num": ["+", ["get", "num"]] },
            'el_num',
            'el_num'
        );
    }

    /**
     * Checks recursively if any element in the array or in it sub-arrays is a string that starts with "name"
     */
    static someArrayItemStartWithName(arr: any): boolean {
        return Array.isArray(arr) && arr.some(
            x => (typeof x === 'string' && x.startsWith('name')) || EtymologyMap.someArrayItemStartWithName(x)
        );
    }

    /**
     * Checks if a map symbol layer is also a name layer
     */
    isNameSymbolLayer(layerId: string): boolean {
        const textField = this.getLayoutProperty(layerId, 'text-field'),
            isSimpleName = textField === '{name:latin}';
        return isSimpleName || EtymologyMap.someArrayItemStartWithName(textField);
    }

    /**
     * Set the application culture for i18n & l10n
     * 
     * @see https://documentation.maptiler.com/hc/en-us/articles/4405445343889-How-to-set-the-language-for-your-map
     * @see https://maplibre.org/maplibre-gl-js-docs/example/language-switch/
     * @see https://docs.mapbox.com/mapbox-gl-js/example/language-switch/
     * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map#setlayoutproperty
     */
    setCulture() {
        const culture = document.documentElement.lang,
            language = culture.split('-')[0];

        const symbolLayerIds = this.getStyle().layers.filter(layer => layer.type == 'symbol').map(layer => layer.id),
            nameLayerIds = symbolLayerIds.filter(id => this.isNameSymbolLayer(id)),
            nameLayerOldTextFields = nameLayerIds.map(id => this.getLayoutProperty(id, 'text-field')),
            newTextField = ['coalesce', ['get', 'name:' + language], ['get', 'name_' + language], ['get', 'name']];
        debugLog("setCulture", { culture, language, symbolLayerIds, nameLayerIds, nameLayerOldTextFields });
        nameLayerIds.forEach(id => this.setLayoutProperty(id, 'text-field', newTextField));
    }
}