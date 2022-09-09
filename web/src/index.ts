//import maplibregl, { Map, Popup, NavigationControl, GeolocateControl, ScaleControl, FullscreenControl, supported, setRTLTextPlugin } from 'maplibre-gl';
import mapboxgl, { Map, Popup, NavigationControl, GeolocateControl, ScaleControl, FullscreenControl, supported, setRTLTextPlugin, MapDataEvent, GeoJSONSource, GeoJSONSourceRaw, LngLatLike, CircleLayer, SymbolLayer, MapMouseEvent, MapboxGeoJSONFeature, CirclePaint } from 'mapbox-gl';

//import { MaptilerGeocoderControl } from './MaptilerGeocoderControl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';

//import 'maplibre-gl/dist/maplibre-gl.css';
import 'mapbox-gl/dist/mapbox-gl.css';

import { logErrorMessage, initSentry } from './sentry';
import { getCorrectFragmentParams, setFragmentParams } from './fragment';
import { BackgroundStyle, BackgroundStyleControl, maptilerBackgroundStyle, mapboxBackgroundStyle } from './BackgroundStyleControl';
import { EtymologyColorControl, getCurrentColorScheme } from './EtymologyColorControl';
import { InfoControl, openInfoWindow } from './InfoControl';
import { featureToDomElement } from "./FeatureElement";
import { getConfig } from './config';
import './style.css';

initSentry();

const google_analytics_id = getConfig("google_analytics_id"),
    matomo_domain = getConfig("matomo_domain"),
    matomo_id = getConfig("matomo_id");

const gtag: Gtag.Gtag = function () { (window as any).dataLayer.push(arguments); }
if (google_analytics_id) {
    console.info("Initializing Google Analytics", { google_analytics_id });
    (window as any).dataLayer = (window as any).dataLayer || [];
    gtag('js', new Date());
    gtag('config', google_analytics_id);
}

if (matomo_domain && matomo_id) {
    console.info("Initializing Matomo", { matomo_domain, matomo_id });
    var _paq = (window as any)._paq = (window as any)._paq || [];
    /* tracker methods like "setCustomDimension" should be called before "trackPageView" */
    _paq.push(['trackPageView']);
    _paq.push(['enableLinkTracking']);
    (function () {
        var u = `https://${matomo_domain}/`;
        _paq.push(['setTrackerUrl', u + 'matomo.php']);
        _paq.push(['setSiteId', matomo_id]);
        var d = document, g = d.createElement('script'), s = d.getElementsByTagName('script')[0];
        g.async = true; g.src = `//cdn.matomo.cloud/${matomo_domain}/matomo.js`; s.parentNode?.insertBefore(g, s);
    })();
}

const maptiler_key = getConfig("maptiler-key"),
    mapbox_token = getConfig("mapbox-token"),
    thresholdZoomLevel_raw = getConfig("threshold-zoom-level"),
    minZoomLevel_raw = getConfig("min-zoom-level"),
    thresholdZoomLevel = thresholdZoomLevel_raw ? parseInt(thresholdZoomLevel_raw) : 14,
    minZoomLevel = minZoomLevel_raw ? parseInt(minZoomLevel_raw) : 9,
    defaultBackgroundStyle_raw = getConfig("default-background-style"),
    defaultBackgroundStyle = defaultBackgroundStyle_raw ? defaultBackgroundStyle_raw : 'mapbox_streets',
    backgroundStyles: BackgroundStyle[] = [];

if (mapbox_token) {
    backgroundStyles.push(
        mapboxBackgroundStyle('mapbox_streets', 'Streets (Mapbox)', 'mapbox', 'streets-v11', mapbox_token),
        mapboxBackgroundStyle('mapbox_dark', 'Dark', 'mapbox', 'dark-v10', mapbox_token)
    );
}

if (maptiler_key) {
    backgroundStyles.push(
        maptilerBackgroundStyle('maptiler_streets', 'Streets (Maptiler)', 'streets', maptiler_key),
        maptilerBackgroundStyle('maptiler_bright', 'Bright', 'bright', maptiler_key),
        maptilerBackgroundStyle('maptiler_hybrid', 'Satellite', 'hybrid', maptiler_key),
        maptilerBackgroundStyle('maptiler_outdoors', 'Outdoors', 'outdoor', maptiler_key),
        maptilerBackgroundStyle('maptiler_osm_carto', 'OSM Carto', 'openstreetmap', maptiler_key)
    );
}

console.info("index start", {
    thresholdZoomLevel,
    minZoomLevel,
    defaultBackgroundStyle,
});

document.addEventListener("DOMContentLoaded", initPage);


/**
 * Show an error/info snackbar
 * 
 * @param {string} message The message to show
 * @param {string} color The color of the snackbar
 * @param {number} timeout The timeout in milliseconds
 * @see https://www.w3schools.com/howto/howto_js_snackbar.asp
 */
function showSnackbar(message: string, color: string = "lightcoral", timeout: number = 3000) {
    const x = document.createElement("div");
    document.body.appendChild(x);
    //const x = document.getElementById("snackbar");
    x.className = "snackbar show";
    x.innerText = message;
    x.style.backgroundColor = color;

    if (timeout) {
        // After N milliseconds, remove the show class from DIV
        setTimeout(function () { x.className = x.className.replace("show", ""); }, timeout);
    }
    return x;
}

/**
 * Initializes the map
 * @see https://docs.maptiler.com/maplibre-gl-js/tutorials/
 * @see https://docs.mapbox.com/help/tutorials/?product=Mapbox+GL+JS
 * @see https://docs.mapbox.com/mapbox-gl-js/example/disable-rotation/
 */
function initMap() {
    const startParams = getCorrectFragmentParams(),
        backgroundStyleObj = backgroundStyles.find(style => style.id == defaultBackgroundStyle),
        startLon = startParams.lon ? startParams.lon : 0,
        startLat = startParams.lat ? startParams.lat : 0;
    console.info("Initializing the map", { startParams, backgroundStyleObj });

    if (typeof mapboxgl == 'object' && typeof mapbox_token == 'string') {
        mapboxgl.accessToken = mapbox_token;
    }

    let map: Map, backgroundStyleUrl: string;
    if (backgroundStyleObj) {
        backgroundStyleUrl = backgroundStyleObj.styleUrl;
    } else {
        logErrorMessage("Invalid default background style", "error", { defaultBackgroundStyle });
        backgroundStyleUrl = backgroundStyles[0].styleUrl;
    }

    // https://maplibre.org/maplibre-gl-js-docs/example/mapbox-gl-rtl-text/
    setRTLTextPlugin(
        './node_modules/@mapbox/mapbox-gl-rtl-text/mapbox-gl-rtl-text.min.js',
        err => err ? console.error("Error loading mapbox-gl-rtl-text", err) : console.info("mapbox-gl-rtl-text loaded"),
        true // Lazy load the plugin
    );

    map = new Map({
        container: 'map',
        style: backgroundStyleUrl,
        center: [startLon, startLat], // starting position [lon, lat]
        zoom: startParams.zoom, // starting zoom
    });
    openInfoWindow(map);

    map.on('load', mapLoadedHandler);
    map.on('styledata', mapStyleDataHandler);

    //map.dragRotate.disable(); // disable map rotation using right click + drag
    //map.touchZoomRotate.disableRotation(); // disable map rotation using touch rotation gesture

    setFragmentParams(startParams.lon, startParams.lat, startParams.zoom, startParams.colorScheme);
    window.addEventListener('hashchange', (e) => hashChangeHandler(e, map), false);
}

/**
 * 
 * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:styledata
 * @see https://docs.mapbox.com/mapbox-gl-js/api/events/#mapdataevent
 */
function mapStyleDataHandler(e: MapDataEvent) {
    //console.info("Map style data loaded", e);
    //setCulture(e.sender); //! Not here, this event is executed too often
}

/**
 * Handles the change of the URL fragment
 */
function hashChangeHandler(e: HashChangeEvent, map: Map) {
    const newParams = getCorrectFragmentParams(),
        currLat = map.getCenter().lat,
        currLon = map.getCenter().lng,
        currZoom = map.getZoom(),
        colorControl = (map as any).currentEtymologyColorControl as EtymologyColorControl | null,
        currColorScheme = colorControl?.getColorScheme();
    //console.info("hashChangeHandler", { newParams, currLat, currLon, currZoom, currColorScheme, e });

    // Check if the position has changed in order to avoid unnecessary map movements
    if (Math.abs(currLat - newParams.lat) > 0.001 ||
        Math.abs(currLon - newParams.lon) > 0.001 ||
        Math.abs(currZoom - newParams.zoom) > 0.1
    ) {
        map.flyTo({
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
function mapSourceDataHandler(e: MapDataEvent) {
    const wikidataSourceEvent = e.dataType == "source" && e.sourceId == "wikidata_source",
        elementsSourceEvent = e.dataType == "source" && e.sourceId == "elements_source",
        sourceDataLoaded = (e as any).isSourceLoaded && (wikidataSourceEvent || elementsSourceEvent),
        map = e.target;
    //console.info("mapSourceDataHandler", {sourceDataLoaded, wikidataSourceEvent, elementsSourceEvent, e});

    if (sourceDataLoaded) {
        //console.info("mapSourceDataHandler: data loaded", { e, source:e.sourceId });
        showSnackbar("Data loaded", "lightgreen");
        if (wikidataSourceEvent) {
            const colorControl = (map as any).currentEtymologyColorControl as EtymologyColorControl | null;
            colorControl?.updateChart(e as any);
        }
    }
}

/**
 * 
 * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:error
 */
function mapErrorHandler(err: any) {
    let errorMessage;
    if (["elements_source", "wikidata_source"].includes(err.sourceId) && err.error.status > 200) {
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
function updateDataSource(map: Map) {
    const bounds = map.getBounds(),
        southWest = bounds.getSouthWest(),
        minLat = southWest.lat,
        minLon = southWest.lng,
        northEast = bounds.getNorthEast(),
        maxLat = northEast.lat,
        maxLon = northEast.lng,
        zoomLevel = map.getZoom(),
        language = document.documentElement.lang,
        enableWikidataLayers = zoomLevel >= thresholdZoomLevel,
        enableElementLayers = zoomLevel < thresholdZoomLevel && zoomLevel >= minZoomLevel,
        enableGlobalLayers = zoomLevel < minZoomLevel;
    /*console.info("updateDataSource", {
        zoomLevel,
        minZoomLevel,
        thresholdZoomLevel,
        enableWikidataLayers,
        enableElementLayers,
        enableGlobalLayers
    });*/

    if (enableWikidataLayers) {
        const queryParams = {
            from: "bbox",
            minLat: (Math.floor(minLat * 1000) / 1000).toString(), // 0.1234 => 0.124 
            minLon: (Math.floor(minLon * 1000) / 1000).toString(),
            maxLat: (Math.ceil(maxLat * 1000) / 1000).toString(), // 0.1234 => 0.123
            maxLon: (Math.ceil(maxLon * 1000) / 1000).toString(),
            language,
        },
            queryString = new URLSearchParams(queryParams).toString(),
            wikidata_url = './etymologyMap.php?' + queryString;

        prepareWikidataLayers(map, wikidata_url, thresholdZoomLevel);
    } else if (enableGlobalLayers) {
        prepareGlobalLayers(map, minZoomLevel);
    } else if (enableElementLayers) {
        const queryParams = {
            from: "bbox",
            onlyCenter: "1",
            minLat: (Math.floor(minLat * 10) / 10).toString(), // 0.1234 => 0.2
            minLon: (Math.floor(minLon * 10) / 10).toString(),
            maxLat: (Math.ceil(maxLat * 10) / 10).toString(), // 0.1234 => 0.1
            maxLon: (Math.ceil(maxLon * 10) / 10).toString(),
            language,
        },
            queryString = new URLSearchParams(queryParams).toString(),
            elements_url = './elements.php?' + queryString;

        prepareElementsLayers(map, elements_url, minZoomLevel, thresholdZoomLevel);
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
function prepareWikidataLayers(map: Map, wikidata_url: string, minZoom: number) {
    const colorSchemeColor = getCurrentColorScheme().color;
    let sourceObject = addGeoJSONSource(
        map,
        "wikidata_source",
        {
            type: 'geojson',
            buffer: 512,
            data: wikidata_url,
            attribution: 'Etymology: <a href="https://www.wikidata.org/wiki/Wikidata:Introduction">Wikidata</a>',
        },
        wikidata_url
    );

    if (!map.getLayer("wikidata_layer_point")) {
        map.addLayer({
            'id': 'wikidata_layer_point',
            'source': 'wikidata_source',
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
        initWikidataLayer(map, "wikidata_layer_point");
    }

    if (!map.getLayer("wikidata_layer_lineString")) {
        map.addLayer({
            'id': 'wikidata_layer_lineString',
            'source': 'wikidata_source',
            'type': 'line',
            "filter": ["==", ["geometry-type"], "LineString"],
            "minzoom": minZoom,
            'paint': {
                'line-color': colorSchemeColor,
                'line-opacity': 0.5,
                'line-width': 12
            }
        }, "wikidata_layer_point");
        initWikidataLayer(map, "wikidata_layer_lineString");
    }

    if (!map.getLayer("wikidata_layer_polygon_border")) {
        map.addLayer({ // https://github.com/mapbox/mapbox-gl-js/issues/3018#issuecomment-277117802
            'id': 'wikidata_layer_polygon_border',
            'source': 'wikidata_source',
            'type': 'line',
            "filter": ["==", ["geometry-type"], "Polygon"],
            "minzoom": minZoom,
            'paint': {
                'line-color': colorSchemeColor,
                'line-opacity': 0.5,
                'line-width': 8,
                'line-offset': -3.5, // https://docs.mapbox.com/mapbox-gl-js/style-spec/layers/#paint-line-line-offset
            }
        }, "wikidata_layer_lineString");
        initWikidataLayer(map, "wikidata_layer_polygon_border");
    }

    if (!map.getLayer("wikidata_layer_polygon_fill")) {
        map.addLayer({
            'id': 'wikidata_layer_polygon_fill',
            'source': 'wikidata_source',
            'type': 'fill',
            "filter": ["==", ["geometry-type"], "Polygon"],
            "minzoom": minZoom,
            'paint': {
                'fill-color': colorSchemeColor,
                'fill-opacity': 0.5,
                'fill-outline-color': "rgba(0, 0, 0, 0)",
            }
        }, "wikidata_layer_polygon_border");
        initWikidataLayer(map, "wikidata_layer_polygon_fill");
    }

    if (!(map as any).currentEtymologyColorControl) {
        (map as any).currentEtymologyColorControl = new EtymologyColorControl(getCorrectFragmentParams().colorScheme);
        setTimeout(() => map.addControl((map as any).currentEtymologyColorControl, 'top-left'), 100); // Delay needed to make sure the dropdown is always under the search bar
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
function initWikidataLayer(map: Map, layerID: string) {
    // When a click event occurs on a feature in the states layer,
    // open a popup at the location of the click, with description
    // HTML from the click event's properties.
    // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:click
    map.on('click', layerID, onWikidataLayerClick);

    // Change the cursor to a pointer when
    // the mouse is over the states layer.
    // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:mouseenter
    map.on('mouseenter', layerID, () => map.getCanvas().style.cursor = 'pointer');

    // Change the cursor back to a pointer
    // when it leaves the states layer.
    // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:mouseleave
    map.on('mouseleave', layerID, () => map.getCanvas().style.cursor = '');
}

/**
 * Handle the click on an item of the wikidata layer
 * 
 * @see https://stackoverflow.com/a/50502455/2347196
 * @see https://maplibre.org/maplibre-gl-js-docs/example/popup-on-click/
 * @see https://docs.mapbox.com/mapbox-gl-js/example/popup-on-click/
 */
function onWikidataLayerClick(e: MapMouseEvent) {
    if ((e as any).popupAlreadyShown) {
        console.info("onWikidataLayerClick: etymology popup already shown", e);
    } else {
        const map = e.target,
            feature = (e as any).features[0] as MapboxGeoJSONFeature,
            //popupPosition = e.lngLat,
            //popupPosition = map.getBounds().getNorthWest(),
            popupPosition = map.unproject([0, 0]),
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
                .addTo(map),
            detail_wrapper = popup.getElement().querySelector(".detail_wrapper");
        console.info("onWikidataLayerClick: showing etymology popup", { e, popup, detail_wrapper });
        if (!detail_wrapper)
            throw new Error("Failed adding the popup");
        const element_loading = document.createElement("span");
        element_loading.innerText = "Loading...";
        detail_wrapper.appendChild(element_loading);
        if (!feature)
            throw new Error("No feature available");
        detail_wrapper.appendChild(featureToDomElement(feature));
        element_loading.style.display = 'none';
        (e as any).popupAlreadyShown = true; // https://github.com/mapbox/mapbox-gl-js/issues/5783#issuecomment-511555713
    }
}

function clusterPaintFromField(field: string, minThreshold: number = 1000, maxThreshold: number = 10000): CirclePaint {
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
function prepareElementsLayers(map: Map, elements_url: string, minZoom: number, maxZoom: number) {
    prepareClusteredLayers(
        map,
        'elements',
        elements_url,
        minZoom,
        maxZoom
    );
}

function addGeoJSONSource(map: Map, id: string, config: GeoJSONSourceRaw, sourceDataURL: string): GeoJSONSource {
    let sourceObject = map.getSource(id) as GeoJSONSource|null,
        oldSourceDataURL = (!!sourceObject && typeof (sourceObject as any)._data === 'string') ? (sourceObject as any)._data : null,
        sourceUrlChanged = oldSourceDataURL != sourceDataURL;
    if (!!sourceObject && sourceUrlChanged) {
        console.info("prepareClusteredLayers: updating source", {
            id, sourceObject, sourceDataURL, oldSourceDataURL
        });
        sourceObject.setData(sourceDataURL);
    } else if (!sourceObject) {
        map.addSource(id, config);
        sourceObject = map.getSource(id) as GeoJSONSource;
        if (sourceObject)
            console.info("addGeoJSONSource success ", { id, config, sourceObject });
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
 * @param {Map} map
 * @param {string} prefix the prefix for the name of each layer
 * @param {string} sourceDataURL
 * @param {number?} minZoom
 * @param {number?} maxZoom
 * @param {*?} clusterProperties GL-JS will automatically add the point_count and point_count_abbreviated properties to each cluster. Other properties can be added with this option.
 * @param {string?} countFieldName Selects the property to be used as count
 * @param {string?} countShowFieldName Selects the property to be shown as count
 * 
 * @see https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/#geojson
 * @see https://docs.mapbox.com/mapbox-gl-js/example/cluster/
 * @see https://github.com/mapbox/mapbox-gl-js/issues/2898
 */
function prepareClusteredLayers(
    map: Map,
    prefix: string,
    sourceDataURL: string,
    minZoom: number | undefined = undefined,
    maxZoom: number | undefined = undefined,
    clusterProperties: any = undefined,
    countFieldName: string | undefined = 'point_count',
    countShowFieldName: string | undefined = 'point_count_abbreviated'
) {
    const sourceName = prefix + '_source',
        clusterLayerName = prefix + '_layer_cluster',
        countLayerName = prefix + '_layer_count',
        pointLayerName = prefix + '_layer_point';
    let sourceObject = addGeoJSONSource(
        map,
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

    if (!map.getLayer(clusterLayerName)) {
        const layerDefinition = {
            id: clusterLayerName,
            source: sourceName,
            type: 'circle',
            maxzoom: maxZoom,
            minzoom: minZoom,
            filter: ['has', countFieldName],
            paint: clusterPaintFromField(countFieldName),
        } as CircleLayer;
        map.addLayer(layerDefinition);


        // inspect a cluster on click
        map.on('click', clusterLayerName, (e) => {
            const feature = getClickedClusterFeature(map, pointLayerName, e),
                clusterId = getClusterFeatureId(feature),
                center = getClusterFeatureCenter(feature),
                defaultZoom = maxZoom ? maxZoom + 0.5 : 9;
            sourceObject.getClusterExpansionZoom(
                clusterId, (err, zoom) => easeToClusterCenter(map, err, zoom, defaultZoom, center)
            );
        });

        map.on('mouseenter', clusterLayerName, () => map.getCanvas().style.cursor = 'pointer');
        map.on('mouseleave', clusterLayerName, () => map.getCanvas().style.cursor = '');

        console.info("prepareClusteredLayers cluster", clusterLayerName, { layerDefinition, layer: map.getLayer(clusterLayerName) });
    }

    if (!map.getLayer(countLayerName)) {
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
        map.addLayer(layerDefinition);
        console.info("prepareClusteredLayers count", countLayerName, { layerDefinition, layer: map.getLayer(countLayerName) });
    }

    if (!map.getLayer(pointLayerName)) {
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
        map.addLayer(layerDefinition);

        map.on('click', pointLayerName, (e) => {
            const feature = getClickedClusterFeature(map, pointLayerName, e),
                center = getClusterFeatureCenter(feature);
            map.easeTo({
                center: center,
                zoom: maxZoom ? maxZoom + 0.5 : 9
            });
        });

        map.on('mouseenter', pointLayerName, () => map.getCanvas().style.cursor = 'pointer');
        map.on('mouseleave', pointLayerName, () => map.getCanvas().style.cursor = '');

        console.info("prepareClusteredLayers point", pointLayerName, { layerDefinition, layer: map.getLayer(pointLayerName) });
    }
}

function getClickedClusterFeature(map: Map, layerId: string, event: MapMouseEvent): MapboxGeoJSONFeature {
    const features = map.queryRenderedFeatures(event.point, { layers: [layerId] }),
        feature = features[0];
    if (!feature)
        throw new Error("No feature found in cluster click");
    return feature;
}

function getClusterFeatureId(feature: MapboxGeoJSONFeature): number {
    const clusterId = feature.properties?.cluster_id;
    if (typeof clusterId != 'number')
        throw new Error("No valid cluster ID found");
    return clusterId;
}

function getClusterFeatureCenter(feature: MapboxGeoJSONFeature): LngLatLike {
    return (feature.geometry as any).coordinates as LngLatLike;
}

/**
 * Callback for getClusterExpansionZoom which eases the map to the cluster center at the calculated zoom

 * @param {number} defaultZoom Default zoom, in case the calculated one is empty (for some reason sometimes it happens)
 * 
 * @see https://docs.mapbox.com/mapbox-gl-js/api/sources/#geojsonsource#getclusterexpansionzoom
 * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map#easeto
 * @see https://docs.mapbox.com/mapbox-gl-js/api/properties/#cameraoptions
 */
function easeToClusterCenter(map: Map, err: any, zoom: number, defaultZoom: number, center: LngLatLike) {
    if (err) {
        logErrorMessage("easeToClusterCenter: Not easing because of an error", "error", err);
    } else {
        if (!zoom) {
            zoom = defaultZoom
            console.warn("easeToClusterCenter: Empty zoom, using default");
        }
        //console.info("easeToClusterCenter", {zoom, center});
        map.easeTo({
            center: center,
            zoom: zoom
        });
    }
}

/**
 * Handles the dragging of a map
 */
function mapMoveEndHandler(e: DragEvent) {
    const map = e.target as unknown as Map;
    updateDataForMapPosition(map);

}

function updateDataForMapPosition(map: Map) {
    const lat = map.getCenter().lat,
        lon = map.getCenter().lng,
        zoom = map.getZoom();
    console.info("mapMoveEndHandler", { lat, lon, zoom });
    updateDataSource(map);
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
function setupGeocoder(map: Map) {
    let control;
    if (typeof mapboxgl == 'object' && typeof MapboxGeocoder == 'function' && typeof mapbox_token == 'string') {
        console.info("Using MapboxGeocoder", { mapboxgl, MapboxGeocoder, mapbox_token });
        control = new MapboxGeocoder({
            accessToken: mapbox_token,
            collapsed: true,
            mapboxgl: mapboxgl
        });
    } /*else if (typeof maplibregl == 'object' && typeof MaptilerGeocoderControl == 'function' && typeof maptiler_key == 'string') {
        console.info("Using MaptilerGeocoderControl", { maplibregl, MaptilerGeocoderControl, maptiler_key });
        control = new MaptilerGeocoderControl(maptiler_key);
    }*/ else {
        console.warn("No geocoding plugin available");
    }

    if (control) {
        map.addControl(control, 'top-left');
    }
}

/**
 * Handles the change of base map
 * 
 * @see https://bl.ocks.org/ryanbaumann/7f9a353d0a1ae898ce4e30f336200483/96bea34be408290c161589dcebe26e8ccfa132d7
 * @see https://github.com/mapbox/mapbox-gl-js/issues/3979
 */
function mapStyleLoadHandler(e: Event) {
    console.info("mapStyleLoadHandler", e);
    const map = e.target as unknown as Map;
    setCulture(map);
    updateDataSource(map);
}

/**
 * Handles the completion of map loading
 */
function mapLoadedHandler(e: Event) {
    console.info("mapLoadedHandler", e);
    const map = e.target as unknown as Map;

    setCulture(map);
    map.on("style.load", mapStyleLoadHandler)
    //openInfoWindow(map);

    updateDataForMapPosition(map);
    // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:idle
    //map.on('idle', updateDataSource); //! Called continuously, avoid
    // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:moveend
    map.on('moveend', mapMoveEndHandler);
    // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:zoomend
    //map.on('zoomend', updateDataSource); // moveend is sufficient

    setupGeocoder(map);

    // https://docs.mapbox.com/mapbox-gl-js/api/markers/#navigationcontrol
    map.addControl(new NavigationControl({
        visualizePitch: true
    }), 'top-right');

    // https://docs.mapbox.com/mapbox-gl-js/example/locate-user/
    // Add geolocate control to the map.
    map.addControl(new GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        // When active the map will receive updates to the device's location as it changes.
        trackUserLocation: false,
        // Draw an arrow next to the location dot to indicate which direction the device is heading.
        showUserHeading: true
    }), 'top-right');

    // https://docs.mapbox.com/mapbox-gl-js/api/markers/#scalecontrol
    map.addControl(new ScaleControl({
        maxWidth: 80,
        unit: 'metric'
    }), 'bottom-left');
    map.addControl(new FullscreenControl(), 'top-right');
    map.addControl(new BackgroundStyleControl(backgroundStyles, defaultBackgroundStyle), 'top-right');
    map.addControl(new InfoControl(), 'top-right');

    map.on('sourcedata', mapSourceDataHandler);

    map.on('error', mapErrorHandler);

    //prepareGlobalLayers(map);
}

/**
 * Initializes the low-zoom-level clustered layer.
 * 
 * @see prepareClusteredLayers
 */
function prepareGlobalLayers(map: Map, maxZoom: number): void {
    prepareClusteredLayers(
        map,
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
function someArrayItemStartWithName(arr: any): boolean {
    return Array.isArray(arr) && arr.some(
        x => (typeof x === 'string' && x.startsWith('name')) || someArrayItemStartWithName(x)
    );
}

/**
 * Checks if a map symbol layer is also a name layer
 */
function isNameSymbolLayer(layerId: string, map: Map): boolean {
    const textField = map.getLayoutProperty(layerId, 'text-field'),
        isSimpleName = textField === '{name:latin}';
    return isSimpleName || someArrayItemStartWithName(textField);
}

/**
 * Set the application culture for i18n & l10n
 * 
 * @see https://documentation.maptiler.com/hc/en-us/articles/4405445343889-How-to-set-the-language-for-your-map
 * @see https://maplibre.org/maplibre-gl-js-docs/example/language-switch/
 * @see https://docs.mapbox.com/mapbox-gl-js/example/language-switch/
 * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map#setlayoutproperty
 */
function setCulture(map: Map) {
    const culture = document.documentElement.lang,
        language = culture.split('-')[0];

    if (!map) {
        console.warn("setCulture: Empty map, can't change map language");
    } else {
        const symbolLayerIds = map.getStyle().layers.filter(layer => layer.type == 'symbol').map(layer => layer.id),
            nameLayerIds = symbolLayerIds.filter(id => isNameSymbolLayer(id, map)),
            nameLayerOldTextFields = nameLayerIds.map(id => map.getLayoutProperty(id, 'text-field')),
            newTextField = ['coalesce', ['get', 'name:' + language], ['get', 'name_' + language], ['get', 'name']];
        console.info("setCulture", { culture, language, symbolLayerIds, nameLayerIds, nameLayerOldTextFields });
        nameLayerIds.forEach(id => map.setLayoutProperty(id, 'text-field', newTextField));
    }
}

/**
 * 
 * @see https://maplibre.org/maplibre-gl-js-docs/example/check-for-support/
 * @see https://docs.mapbox.com/mapbox-gl-js/example/check-for-support/
 */
function initPage(e: Event) {
    console.info("initPage", e);
    //document.addEventListener('deviceready', () => window.addEventListener('backbutton', backButtonHandler, false));
    //setCulture(); //! Map hasn't yet loaded, setLayoutProperty() won't work and labels won't be localized
    if (!supported()) {
        alert('Your browser is not supported');
        logErrorMessage("Device/Browser does not support Maplibre/Mapbox GL JS");
    } else {
        initMap();
        //setCulture(); //! Map style likely still loading, setLayoutProperty() will cause an error
    }
}
