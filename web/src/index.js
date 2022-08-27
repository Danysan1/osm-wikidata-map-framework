import * as Sentry from "@sentry/browser";
const sentry_js_dsn = document.head.querySelector('meta[name="sentry_js_dsn"]')?.content,
    sentry_js_env = document.head.querySelector('meta[name="sentry_js_env"]')?.content;

if (sentry_js_dsn && sentry_js_env) {
    console.info("Initializing Sentry", { sentry_js_dsn, sentry_js_env });
    Sentry.init({
        dsn: sentry_js_dsn,
        environment: sentry_js_env
    });
}

const google_analytics_id = document.head.querySelector('meta[name="google_analytics_id"]')?.content,
    matomo_domain = document.head.querySelector('meta[name="matomo_domain"]')?.content,
    matomo_id = document.head.querySelector('meta[name="matomo_id"]')?.content;

if (google_analytics_id) {
    console.info("Initializing Google Analytics", { google_analytics_id });
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', google_analytics_id);
}

if (matomo_domain && matomo_id) {
    console.info("Initializing Matomo", { matomo_domain, matomo_id });
    var _paq = window._paq = window._paq || [];
    /* tracker methods like "setCustomDimension" should be called before "trackPageView" */
    _paq.push(['trackPageView']);
    _paq.push(['enableLinkTracking']);
    (function () {
        var u = `https://${matomo_domain}/`;
        _paq.push(['setTrackerUrl', u + 'matomo.php']);
        _paq.push(['setSiteId', matomo_id]);
        var d = document, g = d.createElement('script'), s = d.getElementsByTagName('script')[0];
        g.async = true; g.src = `//cdn.matomo.cloud/${matomo_domain}/matomo.js`; s.parentNode.insertBefore(g, s);
    })();
}

//import maplibregl, { Map, Popup, LngLatLike, NavigationControl, GeolocateControl, ScaleControl, FullscreenControl, MapDataEvent, supported, setRTLTextPlugin } from 'maplibre-gl';
import mapboxgl, { Map, Popup, LngLatLike, NavigationControl, GeolocateControl, ScaleControl, FullscreenControl, MapDataEvent, supported, setRTLTextPlugin } from 'mapbox-gl';

//import { NominatimGeocoderControl } from './NominatimGeocoderControl';
//import { MaptilerGeocoderControl } from './MaptilerGeocoderControl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';

//import 'maplibre-gl/dist/maplibre-gl.css';
import 'mapbox-gl/dist/mapbox-gl.css';

import { logErrorMessage, getCorrectFragmentParams, setFragmentParams, defaultColorScheme } from './common';
import { BackgroundStyleControl, maptilerBackgroundStyle, mapboxBackgroundStyle } from './BackgroundStyleControl';
import { EtymologyColorControl, colorSchemes } from './EtymologyColorControl';
import { InfoControl, openInfoWindow } from './InfoControl';
import { featureToDomElement } from "./FeatureElement";

import './style.css';

const maptiler_key = document.head.querySelector('meta[name="maptiler_key"]')?.content,
    mapbox_token = document.head.querySelector('meta[name="mapbox_token"]')?.content,
    thresholdZoomLevel = parseInt(document.head.querySelector('meta[name="thresholdZoomLevel"]')?.content),
    minZoomLevel = parseInt(document.head.querySelector('meta[name="minZoomLevel"]')?.content),
    defaultBackgroundStyle = document.head.querySelector('meta[name="defaultBackgroundStyle"]')?.content,
    backgroundStyles = [
        mapboxBackgroundStyle('mapbox_streets', 'Streets (Mapbox)', 'mapbox', 'streets-v11', mapbox_token),
        mapboxBackgroundStyle('mapbox_dark', 'Dark', 'mapbox', 'dark-v10', mapbox_token)
    ];

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
function showSnackbar(message, color = "lightcoral", timeout = 3000) {
    const x = document.createElement("div");
    document.body.appendChild(x);
    //const x = document.getElementById("snackbar");
    x.className = "snackbar show";
    x.innerText = message;
    x.style = "background-color:" + color;

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
 */
function initMap() {
    const startParams = getCorrectFragmentParams(),
        backgroundStyleObj = backgroundStyles.find(style => style.id == defaultBackgroundStyle);
    console.info("Initializing the map", { startParams, backgroundStyleObj });

    if (typeof mapboxgl == 'object' && typeof mapbox_token == 'string') {
        mapboxgl.accessToken = mapbox_token;
    }

    let map, backgroundStyle;
    if (backgroundStyleObj) {
        backgroundStyle = backgroundStyleObj.styleUrl;
    } else {
        logErrorMessage("Invalid default background style", "error", { defaultBackgroundStyle });
        backgroundStyle = backgroundStyles[0].styleUrl;
    }

    // https://maplibre.org/maplibre-gl-js-docs/example/mapbox-gl-rtl-text/
    setRTLTextPlugin(
        './node_modules/@mapbox/mapbox-gl-rtl-text/mapbox-gl-rtl-text.min.js',
        err => err ? console.error("Error loading mapbox-gl-rtl-text", err) : console.info("mapbox-gl-rtl-text loaded"),
        true // Lazy load the plugin
    );

    map = new Map({
        container: 'map',
        style: backgroundStyle,
        center: [startParams.lon, startParams.lat], // starting position [lon, lat]
        zoom: startParams.zoom, // starting zoom
    });
    openInfoWindow(map);

    map.on('load', mapLoadedHandler);
    map.on('styledata', mapStyleDataHandler);

    setFragmentParams(startParams.lon, startParams.lat, startParams.zoom, startParams.colorScheme);
    window.addEventListener('hashchange', (e) => hashChangeHandler(e, map), false);
}

/**
 * 
 * @param {MapDataEvent} e The event to handle 
 * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:styledata
 * @see https://docs.mapbox.com/mapbox-gl-js/api/events/#mapdataevent
 */
function mapStyleDataHandler(e) {
    //console.info("Map style data loaded", e);
    //setCulture(e.sender); //! Not here, this event is executed too often
}

/**
 * Handles the change of fragment data
 * 
 * @param {HashChangeEvent} e The event to handle 
 * @param {Map} map 
 * @returns {void}
 */
function hashChangeHandler(e, map) {
    const newParams = getCorrectFragmentParams(),
        currLat = map.getCenter().lat,
        currLon = map.getCenter().lng,
        currZoom = map.getZoom(),
        currColorScheme = map.currentEtymologyColorControl?.getColorScheme();
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
        map.currentEtymologyColorControl?.setColorScheme(map, newParams.colorScheme);
}

/**
 * Event listener that fires when one of the map's sources loads or changes.
 * 
 * @param {MapDataEvent} e The event to handle
 * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:sourcedata
 * @see https://docs.mapbox.com/mapbox-gl-js/api/events/#mapdataevent
 */
function mapSourceDataHandler(e) {
    const wikidataSourceEvent = e.dataType == "source" && e.sourceId == "wikidata_source",
        overpassSourceEvent = e.dataType == "source" && e.sourceId == "elements_source",
        ready = e.isSourceLoaded,
        map = e.target;

    if (ready) {
        if (wikidataSourceEvent || overpassSourceEvent) {
            //console.info("mapSourceDataHandler: data loaded", { e, source:e.sourceId });
            showSnackbar("Data loaded", "lightgreen");
            if (wikidataSourceEvent && map.currentEtymologyColorControl) {
                map.currentEtymologyColorControl.updateChart(e);
            }
        } else {
            //console.info("mapSourceDataHandler: ready event", { e, source:e.sourceId });
            //updateDataSource(e);
        }
    }
}

/**
 * 
 * @param {any} err 
 * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:error
 */
function mapErrorHandler(err) {
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
 * @param {Event} event 
 * @see https://docs.mapbox.com/mapbox-gl-js/example/external-geojson/
 * @see https://docs.mapbox.com/mapbox-gl-js/example/geojson-polygon/
 */
function updateDataSource(event) {
    // https://stackoverflow.com/questions/48592137/bounding-box-in-mapbox-js
    // https://leafletjs.com/reference-1.7.1.html#map-getbounds
    const map = event.target,
        bounds = map.getBounds(),
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
            minLat: Math.floor(minLat * 1000) / 1000, // 0.1234 => 0.124 
            minLon: Math.floor(minLon * 1000) / 1000,
            maxLat: Math.ceil(maxLat * 1000) / 1000, // 0.1234 => 0.123
            maxLon: Math.ceil(maxLon * 1000) / 1000,
            language,
        },
            queryString = new URLSearchParams(queryParams).toString(),
            wikidata_url = './etymologyMap.php?' + queryString;

        prepareWikidataLayers(map, wikidata_url, thresholdZoomLevel);
        const wikidata_source = map.getSource("wikidata_source");
        console.info("Wikidata dataSource update", { queryParams, wikidata_url, wikidata_source });

        //showSnackbar("Fetching data...", "lightblue");
        if (wikidata_source) {
            wikidata_source.setData(wikidata_url);
        } else {
            console.error("updateDataSource: missing wikidata_source");
        }
    } else if (enableGlobalLayers) {
        prepareGlobalLayers(map, minZoomLevel);

        //showSnackbar("Please zoom more to see data", "orange");
    } else if (enableElementLayers) {
        const queryParams = {
            from: "bbox",
            onlyCenter: true,
            minLat: Math.floor(minLat * 10) / 10, // 0.1234 => 0.2
            minLon: Math.floor(minLon * 10) / 10,
            maxLat: Math.ceil(maxLat * 10) / 10, // 0.1234 => 0.1
            maxLon: Math.ceil(maxLon * 10) / 10,
            language,
        },
            queryString = new URLSearchParams(queryParams).toString(),
            elements_url = './elements.php?' + queryString;

        prepareElementsLayers(map, elements_url, minZoomLevel, thresholdZoomLevel);
        const elements_source = map.getSource("elements_source");
        console.info("Overpass dataSource update", { queryParams, elements_url, elements_source });

        //showSnackbar("Fetching data...", "lightblue");
        if (elements_source) {
            elements_source.setData(elements_url);
        } else {
            console.error("updateDataSource: missing elements_source");
        }
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
 * @param {Map} map
 * @param {string} wikidata_url
 * @param {number} minZoom
 * 
 * @see initWikidataLayer
 * @see https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/#geojson
 * @see https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/#geojson-attribution
 * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map#addlayer
 * @see https://docs.mapbox.com/mapbox-gl-js/example/geojson-layer-in-stack/
 */
function prepareWikidataLayers(map, wikidata_url, minZoom) {
    if (!map.getSource("wikidata_source")) {
        map.addSource('wikidata_source', {
            type: 'geojson',
            buffer: 512,
            data: wikidata_url,
            attribution: 'Etymology: <a href="https://www.wikidata.org/wiki/Wikidata:Introduction">Wikidata</a>',
        });
    }

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
                'circle-color': colorSchemes[defaultColorScheme].color,
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
                'line-color': colorSchemes[defaultColorScheme].color,
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
                'line-color': colorSchemes[defaultColorScheme].color,
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
                'fill-color': colorSchemes[defaultColorScheme].color,
                'fill-opacity': 0.5,
                'fill-outline-color': "rgba(0, 0, 0, 0)",
            }
        }, "wikidata_layer_polygon_border");
        initWikidataLayer(map, "wikidata_layer_polygon_fill");
    }

    if (!map.currentEtymologyColorControl) {
        map.currentEtymologyColorControl = new EtymologyColorControl(getCorrectFragmentParams().colorScheme);
        setTimeout(() => map.addControl(map.currentEtymologyColorControl, 'top-left'), 100); // Delay needed to make sure the dropdown is always under the search bar
    }
}

/**
 * Completes low-level details of the high zoom Wikidata layer
 * 
 * @param {Map} map
 * @param {string} layerID 
 * 
 * @see prepareWikidataLayers
 * @see https://docs.mapbox.com/mapbox-gl-js/example/polygon-popup-on-click/
 * @see https://docs.mapbox.com/mapbox-gl-js/example/popup-on-click/
 * @see https://docs.mapbox.com/mapbox-gl-js/api/markers/#popup
 */
function initWikidataLayer(map, layerID) {
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

function onWikidataLayerClick(e) {
    if (e.popupAlreadyShown) {
        console.info("onWikidataLayerClick: etymology popup already shown", e);
    } else {
        const map = e.target,
            //popupPosition = e.lngLat,
            popupPosition = map.getBounds().getNorthWest(),
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
                .setHTML('<div class="detail_wrapper"></div>')
                .addTo(map);
        console.info("onWikidataLayerClick: showing etymology popup", { e, popup });
        popup.getElement().querySelector(".detail_wrapper").appendChild(featureToDomElement(e.features[0]));
        e.popupAlreadyShown = true; // https://github.com/mapbox/mapbox-gl-js/issues/5783#issuecomment-511555713
    }
}

/**
 * 
 * @param {string} field 
 * @param {int} minThreshold 
 * @param {int} maxThreshold 
 * @returns {object} 
 */
function clusterPaintFromField(field, minThreshold = 1000, maxThreshold = 10000) {
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
 * @param {Map} map
 * @param {string} elements_url
 * @param {number} minZoom
 * @param {number} maxZoom
 * 
 * @see prepareClusteredLayers
 */
function prepareElementsLayers(map, elements_url, minZoom, maxZoom) {
    prepareClusteredLayers(
        map,
        'elements',
        elements_url,
        minZoom,
        maxZoom
    );
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
    map,
    prefix,
    sourceDataURL,
    minZoom = undefined,
    maxZoom = undefined,
    clusterProperties = undefined,
    countFieldName = 'point_count',
    countShowFieldName = 'point_count_abbreviated'
) {
    const sourceName = prefix + '_source',
        clusterLayerName = prefix + '_layer_cluster',
        countLayerName = prefix + '_layer_count',
        pointLayerName = prefix + '_layer_point';
    if (!map.getSource(sourceName)) {
        map.addSource(sourceName, {
            type: 'geojson',
            //buffer: 512,
            data: sourceDataURL,
            cluster: true,
            maxzoom: maxZoom,
            //clusterMaxZoom: maxZoom, // Max zoom to cluster points on
            clusterRadius: 125, // Radius of each cluster when clustering points (defaults to 50)
            clusterProperties: clusterProperties,
            clusterMinPoints: 1
        });
        console.info("prepareClusteredLayers " + sourceName, { maxZoom, source: map.getSource(sourceName) });
    }

    if (!map.getLayer(clusterLayerName)) {
        const layerDefinition = {
            id: clusterLayerName,
            source: sourceName,
            type: 'circle',
            maxzoom: maxZoom,
            minzoom: minZoom,
            filter: ['has', countFieldName],
            paint: clusterPaintFromField(countFieldName),
        };
        map.addLayer(layerDefinition);


        // inspect a cluster on click
        map.on('click', clusterLayerName, (e) => {
            const features = map.queryRenderedFeatures(e.point, {
                layers: [clusterLayerName]
            }),
                clusterId = features[0].properties.cluster_id,
                center = features[0].geometry.coordinates;
            console.info('Click ' + clusterLayerName, features, clusterId, center);
            map.getSource(sourceName).getClusterExpansionZoom(
                clusterId, (err, zoom) => easeToClusterCenter(map, err, zoom, maxZoom + 0.5, center)
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
        };
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
        };
        map.addLayer(layerDefinition);

        map.on('click', pointLayerName, (e) => {
            const features = map.queryRenderedFeatures(e.point, {
                layers: [pointLayerName]
            }),
                center = features[0].geometry.coordinates;
            console.info('Click ' + pointLayerName, features, center);
            map.easeTo({
                center: center,
                zoom: maxZoom + 0.5
            });
        });

        map.on('mouseenter', pointLayerName, () => map.getCanvas().style.cursor = 'pointer');
        map.on('mouseleave', pointLayerName, () => map.getCanvas().style.cursor = '');

        console.info("prepareClusteredLayers point", pointLayerName, { layerDefinition, layer: map.getLayer(pointLayerName) });
    }
}

/**
 * Callback for getClusterExpansionZoom which eases the map to the cluster center at the calculated zoom
 * 
 * @param {Map} map
 * @param {*} err 
 * @param {number} zoom
 * @param {number} defaultZoom Default zoom, in case the calculated one is empty (for some reason sometimes it happens)
 * @param {LngLatLike} center
 * 
 * @see https://docs.mapbox.com/mapbox-gl-js/api/sources/#geojsonsource#getclusterexpansionzoom
 * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map#easeto
 * @see https://docs.mapbox.com/mapbox-gl-js/api/properties/#cameraoptions
 */
function easeToClusterCenter(map, err, zoom, defaultZoom, center) {
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
 * 
 * @param {DragEvent} e The event to handle 
 */
function mapMoveEndHandler(e) {
    updateDataSource(e);
    const map = e.target,
        lat = map.getCenter().lat,
        lon = map.getCenter().lng,
        zoom = map.getZoom();
    console.info("mapMoveEndHandler", { e, lat, lon, zoom });
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
 * @param {Map} map
 * @see https://maplibre.org/maplibre-gl-js-docs/example/geocoder/
 * @see https://github.com/maplibre/maplibre-gl-geocoder
 * @see https://github.com/maplibre/maplibre-gl-geocoder/blob/main/API.md
 * @see https://docs.mapbox.com/mapbox-gl-js/example/mapbox-gl-geocoder/
 */
function setupGeocoder(map) {
    let control;
    if (typeof mapboxgl == 'object' && typeof MapboxGeocoder == 'function' && typeof mapbox_token == 'string') {
        control = new MapboxGeocoder({
            accessToken: mapbox_token,
            collapsed: true,
            mapboxgl: mapboxgl
        });
    } else if (typeof maplibregl == 'object' && typeof MaptilerGeocoderControl == 'function' && typeof maptiler_key == 'string') {
        control = new MaptilerGeocoderControl(maptiler_key);
    } else if (typeof maplibregl == 'object' && typeof NominatimGeocoderControl == 'function') {
        control = new NominatimGeocoderControl({ maplibregl: maplibregl });
    } else {
        console.warn("No geocoding plugin available", { mapboxgl, MapboxGeocoder, mapbox_token });
    }

    if (control) {
        map.addControl(control, 'top-left');
    }
}

/**
 * Handles the change of base map
 * 
 * @param {Event} e 
 * @see https://bl.ocks.org/ryanbaumann/7f9a353d0a1ae898ce4e30f336200483/96bea34be408290c161589dcebe26e8ccfa132d7
 * @see https://github.com/mapbox/mapbox-gl-js/issues/3979
 */
function mapStyleLoadHandler(e) {
    console.info("mapStyleLoadHandler", e);
    setCulture(e.target);
    updateDataSource(e);
}

/**
 * Handles the completion of map loading
 * 
 * @param {Event} e 
 */
function mapLoadedHandler(e) {
    console.info("mapLoadedHandler", e);
    const map = e.target;

    document.getElementById('map').style.visibility = 'visible';
    document.getElementById('map_static_preview').style.visibility = 'hidden';

    setCulture(map);
    map.on("style.load", mapStyleLoadHandler)
    //openInfoWindow(map);

    mapMoveEndHandler(e);
    // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:idle
    //map.on('idle', updateDataSource); //! Called continuously, avoid
    // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:moveend
    map.on('moveend', mapMoveEndHandler);
    // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:zoomend
    //map.on('zoomend', updateDataSource); // moveend is sufficient

    setupGeocoder(map, maptiler_key);

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
 * @param {Map} map
 * @param {number} maxZoom
 * 
 * @see prepareClusteredLayers
 */
function prepareGlobalLayers(map, maxZoom) {
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
 * Checks if any element in the array or in it sub-arrays is a string that starts with "name"
 * 
 * @param {array} arr 
 * @returns {boolean}
 */
function someStartWithName(arr) {
    return arr.some(
        x => (typeof x === 'string' && x.startsWith('name')) || (Array.isArray(x) && someStartWithName(x))
    );
}

/**
 * Checks if a map symbol layer is also a name layer
 * 
 * @param {string} layerId 
 * @param {Map} map
 * @returns {boolean}
 */
function isNameSymbolLayer(layerId, map) {
    const textField = map.getLayoutProperty(layerId, 'text-field'),
        isSimpleName = textField === '{name:latin}';
    return isSimpleName || (Array.isArray(textField) && someStartWithName(textField))
}

/**
 * Set the application culture for i18n & l10n
 * 
 * @param {Map} map
 * @return {void}
 * @see https://documentation.maptiler.com/hc/en-us/articles/4405445343889-How-to-set-the-language-for-your-map
 * @see https://maplibre.org/maplibre-gl-js-docs/example/language-switch/
 * @see https://docs.mapbox.com/mapbox-gl-js/example/language-switch/
 * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map#setlayoutproperty
 */
function setCulture(map) {
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
 * @param {Event} e The event to handle 
 * @see https://maplibre.org/maplibre-gl-js-docs/example/check-for-support/
 * @see https://docs.mapbox.com/mapbox-gl-js/example/check-for-support/
 */
function initPage(e) {
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
