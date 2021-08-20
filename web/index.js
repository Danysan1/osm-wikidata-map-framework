const defaultBackgroundStyle = 'mapbox://styles/mapbox/streets-v11',
    thresholdZoomLevel = parseInt($("#threshold-zoom-level").val()),
    backgroundStyles = [
        ['Streets', 'mapbox://styles/mapbox/streets-v11'],
        ['Light', 'mapbox://styles/mapbox/light-v10'],
        ['Dark', 'mapbox://styles/mapbox/dark-v10'],
        ['Satellite', 'mapbox://styles/mapbox/satellite-v9']
    ];
let map;

/**
 * Let the user choose the map style.
 * 
 * Control implemented as ES6 class
 * https://docs.mapbox.com/mapbox-gl-js/api/markers/#icontrol
 **/
class BackgroundStyleControl {

    onAdd(map) {
        this._map = map;

        this._container = document.createElement('div');
        this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group background-style-ctrl';

        const table = document.createElement('table');
        this._container.appendChild(table);

        const tr = document.createElement('tr');
        table.appendChild(tr);

        const td1 = document.createElement('td'),
            td2 = document.createElement('td');
        tr.appendChild(td1);
        tr.appendChild(td2);

        const ctrlBtn = document.createElement('button');
        ctrlBtn.className = 'background-style-ctrl-button';
        ctrlBtn.title = 'Choose background style';
        ctrlBtn.textContent = '🌐';
        // https://stackoverflow.com/questions/36489579/this-within-es6-class-method
        ctrlBtn.onclick = this.btnClickHandler.bind(this);
        td2.appendChild(ctrlBtn);

        this._ctrlDropDown = document.createElement('select');
        this._ctrlDropDown.className = 'hiddenDropDown';
        this._ctrlDropDown.title = 'Background style';
        this._ctrlDropDown.onchange = this.dropDownClickHandler.bind(this);
        td1.appendChild(this._ctrlDropDown);

        for (const [text, value] of backgroundStyles) {
            const option = document.createElement('option');
            option.innerText = text;
            option.value = value;
            if (value === defaultBackgroundStyle) {
                option.selected = true;
            }
            this._ctrlDropDown.appendChild(option);
        }

        return this._container;
    }

    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this._map = undefined;
    }

    btnClickHandler(event) {
        console.info("BackgroundStyleControl button click", event);
        this._ctrlDropDown.className = 'visibleDropDown';
    }

    dropDownClickHandler(event) {
        console.info("BackgroundStyleControl dropDown click", event);
        this._map.setStyle(event.target.value);
        this._ctrlDropDown.className = 'hiddenDropDown';
        //updateDataSource(event);
    }

}

/**
 * 
 * 
 * Control implemented as ES6 class
 * https://docs.mapbox.com/mapbox-gl-js/api/markers/#icontrol
 **/
/*class EtymologyColorControl {
    btnClickHandler(x) {
        console.info("EtymologyColorControl click", x);
    }

    onAdd(map) {
        this._map = map;
        this._container = document.createElement('div');
        this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';

        //this._container.textContent = 'Hello, world';
        const ctrlBtn = document.createElement('button');
        ctrlBtn.className = 'etymology-color-ctrl-button';
        ctrlBtn.textContent = '🎨';
        ctrlBtn.onclick = this.btnClickHandler;
        this._container.appendChild(ctrlBtn);

        return this._container;
    }

    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this._map = undefined;
    }
}*/

function initMap() {
    if (map) {
        console.info("The map is already initialized");
    } else {
        console.info("Initializing the map");
        mapboxgl.accessToken = mapbox_gl_token;
        let params = window.location.hash ? window.location.hash.substr(1).split(",") : null,
            startCenterLon = (params && params[0]) ? parseFloat(params[0]) : NaN,
            startCenterLat = (params && params[1]) ? parseFloat(params[1]) : NaN,
            startZoom = (params && params[2]) ? parseFloat(params[2]) : NaN;
        if (isNaN(startCenterLon) || isNaN(startCenterLat) || isNaN(startZoom)) {
            startCenterLon = default_center_lon;
            startCenterLat = default_center_lat;
            startZoom = default_zoom;
        }

        map = new mapboxgl.Map({
            container: 'map',
            style: defaultBackgroundStyle, // stylesheet location
            center: [startCenterLon, startCenterLat], // starting position [lon, lat]
            zoom: startZoom, // starting zoom
            /*pitch: 45, // starting pitch
            bearing: -17.6,
            antialias: true*/
        });

        map.on('load', mapLoadedHandler);
    }
}

/*function rotateCamera(timestamp) {
    // clamp the rotation between 0 -360 degrees
    // Divide timestamp by 100 to slow rotation to ~10 degrees / sec
    map.rotateTo((timestamp / 100) % 360, { duration: 0 });
    // Request the next frame of the animation.
    requestAnimationFrame(rotateCamera);
}*/

/**
 * Event listener that fires when one of the map's sources loads or changes.
 * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:sourcedata
 * @see https://docs.mapbox.com/mapbox-gl-js/api/events/#mapdataevent
 */
function mapSourceDataHandler(e) {
    const wikidataSourceEvent = e.dataType == "source" && e.sourceId == "wikidata_source",
        overpassSourceEvent = e.dataType == "source" && e.sourceId == "overpass_source",
        ready = e.isSourceLoaded;
    //console.info('sourcedata event', { wikidataSourceEvent, ready, e });

    if (ready) {
        console.info('sourcedata ready event', { wikidataSourceEvent, e });
        if (wikidataSourceEvent || overpassSourceEvent) {
            //kendo.ui.progress($("#map"), false);
        } else {
            updateDataSource(e);
        }
    }
}

/**
 * @see https://docs.mapbox.com/mapbox-gl-js/example/external-geojson/
 * @see https://docs.mapbox.com/mapbox-gl-js/example/geojson-polygon/
 */
function updateDataSource(e) {
    // https://stackoverflow.com/questions/48592137/bounding-box-in-mapbox-js
    // https://leafletjs.com/reference-1.7.1.html#map-getbounds
    const bounds = map.getBounds(),
        southWest = bounds.getSouthWest(),
        minLat = southWest.lat,
        minLon = southWest.lng,
        northEast = bounds.getNorthEast(),
        maxLat = northEast.lat,
        maxLon = northEast.lng,
        zoomLevel = map.getZoom(),
        language = document.documentElement.lang,
        queryParams = {
            from: "bbox",
            minLat,
            minLon,
            maxLat,
            maxLon,
            language,
            format: "geojson"
        };
    //console.info("updateDataSource", { e, queryParams, zoomLevel, thresholdZoomLevel });
    //console.trace("updateDataSource");

    //kendo.ui.progress($("#map"), true);
    if (zoomLevel >= thresholdZoomLevel) {
        const wikidata_source = map.getSource("wikidata_source"),
            queryString = new URLSearchParams(queryParams).toString(),
            wikidata_url = './etymologyMap.php?' + queryString;
        console.info("Wikidata dataSource update", { queryParams, wikidata_url, wikidata_source });
        if (wikidata_source) {
            wikidata_source.setData(wikidata_url);
        } else {
            prepareWikidataLayers(wikidata_url);
        }
    } else {
        //queryParams.onlySkeleton = false;
        queryParams.onlyCenter = true;
        const overpass_source = map.getSource("overpass_source"),
            queryString = new URLSearchParams(queryParams).toString(),
            overpass_url = './overpass.php?' + queryString;
        console.info("Overpass dataSource update", { queryParams, overpass_url, overpass_source });
        if (overpass_source) {
            overpass_source.setData(overpass_url);
        } else {
            prepareOverpassLayers(overpass_url);
        }
    }
}

/**
 * Initializes the high-zoom-level complete (un-clustered) layer.
 * 
 * @see https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/#geojson
 * @see https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/#geojson-attribution
 */
function prepareWikidataLayers(wikidata_url) {
    map.addSource('wikidata_source', {
        type: 'geojson',
        buffer: 512,
        data: wikidata_url,
        attribution: 'Etymology: <a href="https://www.wikidata.org/wiki/Wikidata:Introduction" target="_blank">Wikidata</a>',
    });

    map.addLayer({
        'id': 'wikidata_layer_point',
        'source': 'wikidata_source',
        'type': 'circle',
        "filter": ["==", ["geometry-type"], "Point"],
        "minzoom": thresholdZoomLevel,
        'paint': {
            'circle-radius': 8,
            'circle-stroke-width': 2,
            'circle-color': '#0080ff',
            'circle-stroke-color': 'white'
        }
    });

    map.addLayer({
        'id': 'wikidata_layer_lineString',
        'source': 'wikidata_source',
        'type': 'line',
        "filter": ["==", ["geometry-type"], "LineString"],
        "minzoom": thresholdZoomLevel,
        'paint': {
            'line-color': '#0080ff',
            'line-opacity': 0.5,
            'line-width': 7
        }
    });

    map.addLayer({
        'id': 'wikidata_layer_polygon',
        'source': 'wikidata_source',
        'type': 'fill',
        "filter": ["==", ["geometry-type"], "Polygon"],
        "minzoom": thresholdZoomLevel,
        'paint': {
            'fill-color': '#0080ff', // blue color fill
            'fill-opacity': 0.5
        }
    });

    // https://docs.mapbox.com/mapbox-gl-js/example/polygon-popup-on-click/
    // https://docs.mapbox.com/mapbox-gl-js/example/popup-on-click/
    ["wikidata_layer_point", "wikidata_layer_lineString", "wikidata_layer_polygon"].forEach(function(layerID) {
        // When a click event occurs on a feature in the states layer,
        // open a popup at the location of the click, with description
        // HTML from the click event's properties.
        // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:click
        map.on('click', layerID, function(e) {
            // https://docs.mapbox.com/mapbox-gl-js/api/markers/#popup
            const popup = new mapboxgl.Popup({ maxWidth: "none" })
                .setLngLat(e.lngLat)
                .setHTML(featureToHTML(e.features[0]));
            //console.info("showEtymologyPopup", { e, popup });
            popup.addTo(map);
        });

        // Change the cursor to a pointer when
        // the mouse is over the states layer.
        // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:mouseenter
        map.on('mouseenter', layerID, () => map.getCanvas().style.cursor = 'pointer');

        // Change the cursor back to a pointer
        // when it leaves the states layer.
        // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:mouseleave
        map.on('mouseleave', layerID, () => map.getCanvas().style.cursor = '');
    });
}

/**
 * Initializes the low-zoom-level clustered layer.
 * 
 * @see https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/#geojson
 * @see https://docs.mapbox.com/mapbox-gl-js/example/cluster/
 * Add a new source from our GeoJSON data and set the 'cluster' option to true.
 * GL-JS will add the point_count property to your source data.
 * //@see https://docs.mapbox.com/mapbox-gl-js/example/heatmap-layer/
 */
function prepareOverpassLayers(overpass_url) {
    map.addSource('overpass_source', {
        type: 'geojson',
        //buffer: 512,
        data: overpass_url,
        cluster: true,
        clusterMaxZoom: thresholdZoomLevel, // Max zoom to cluster points on
        clusterRadius: 50 // Radius of each cluster when clustering points (defaults to 50)
    });

    map.addLayer({
        id: 'overpass_layer_cluster',
        source: 'overpass_source',
        type: 'circle',
        maxzoom: thresholdZoomLevel,
        filter: ['has', 'point_count'],
        paint: {
            // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
            // with three steps to implement three types of circles:
            // - Blue, 20px circles when point count is less than 100
            // - Yellow, 30px circles when point count is between 100 and 750
            // - Pink, 40px circles when point count is greater than or equal to 750
            'circle-color': [
                'step', ['get', 'point_count'], '#51bbd6', 30, '#f1f075', 750, '#f28cb1'
            ],
            'circle-radius': [
                'step', ['get', 'point_count'], 20, 30, 30, 750, 40
            ]
        }
    });

    map.addLayer({
        id: 'overpass_layer_count',
        type: 'symbol',
        source: 'overpass_source',
        maxzoom: thresholdZoomLevel,
        filter: ['has', 'point_count'],
        layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12
        }
    });

    map.addLayer({
        id: 'overpass_layer_point',
        type: 'circle',
        source: 'overpass_source',
        maxzoom: thresholdZoomLevel,
        filter: ['!', ['has', 'point_count']],
        paint: {
            'circle-color': '#11b4da',
            'circle-radius': 10,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff'
        }
    });

    // inspect a cluster on click
    map.on('click', 'overpass_layer_cluster', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
            layers: ['overpass_layer_cluster']
        });
        const clusterId = features[0].properties.cluster_id;
        map.getSource('overpass_source').getClusterExpansionZoom(
            clusterId,
            (err, zoom) => {
                if (err) return;

                map.easeTo({
                    center: features[0].geometry.coordinates,
                    zoom: zoom
                });
            }
        );
    });

    map.on('click', 'overpass_layer_point', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
            layers: ['overpass_layer_point']
        });
        map.easeTo({
            center: features[0].geometry.coordinates,
            zoom: thresholdZoomLevel + 1
        });
    });

    map.on('mouseenter', 'overpass_layer_cluster', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'overpass_layer_cluster', () => map.getCanvas().style.cursor = '');
    map.on('mouseenter', 'overpass_layer_point', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'overpass_layer_point', () => map.getCanvas().style.cursor = '');
}

function mapMoveEndHandler(e) {
    updateDataSource(e);
    window.location.hash = "#" + map.getCenter().lng + "," + map.getCenter().lat + "," + map.getZoom();
}

function mapLoadedHandler(e) {
    mapMoveEndHandler(e)
        // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:idle
        //map.on('idle', updateDataSource); //! Called continuously, avoid
        // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:moveend
    map.on('moveend', mapMoveEndHandler);
    // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:zoomend
    //map.on('zoomend', updateDataSource); // moveend is sufficient

    // https://docs.mapbox.com/mapbox-gl-js/example/mapbox-gl-geocoder/
    map.addControl(new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl
    }));

    // https://docs.mapbox.com/mapbox-gl-js/api/markers/#navigationcontrol
    map.addControl(
        new mapboxgl.NavigationControl({
            visualizePitch: true
        })
    );

    // https://docs.mapbox.com/mapbox-gl-js/api/markers/#attributioncontrol
    /*map.addControl(new mapboxgl.AttributionControl({
        customAttribution: 'Etymology: <a href="https://www.wikidata.org/wiki/Wikidata:Introduction" target="_blank">Wikidata</a>'
    }));*/

    // https://docs.mapbox.com/mapbox-gl-js/example/locate-user/
    // Add geolocate control to the map.
    map.addControl(
        new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            // When active the map will receive updates to the device's location as it changes.
            trackUserLocation: false,
            // Draw an arrow next to the location dot to indicate which direction the device is heading.
            showUserHeading: true
        })
    );

    // https://docs.mapbox.com/mapbox-gl-js/api/markers/#scalecontrol
    const scale = new mapboxgl.ScaleControl({
        maxWidth: 80,
        unit: 'metric'
    });
    map.addControl(scale);

    map.addControl(new BackgroundStyleControl());

    //map.addControl(new EtymologyColorControl());

    map.on('sourcedata', mapSourceDataHandler);

    /*rotateCamera(0); // Start the animation.

    // Add 3d buildings and remove label layers to enhance the map
    var layers = map.getStyle().layers;
    for (var i = 0; i < layers.length; i++) {
        if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
            // remove text labels
            map.removeLayer(layers[i].id);
        }
    }

    map.addLayer({
        'id': '3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'filter': ['==', 'extrude', 'true'],
        'type': 'fill-extrusion',
        'minzoom': 15,
        'paint': {
            'fill-extrusion-color': '#aaa',

            // use an 'interpolate' expression to add a smooth transition effect to the
            // buildings as the user zooms in
            'fill-extrusion-height': [
                "interpolate", ["linear"], ["zoom"],
                15, 0,
                15.05, ["get", "height"]
            ],
            'fill-extrusion-base': [
                "interpolate", ["linear"], ["zoom"],
                15, 0,
                15.05, ["get", "min_height"]
            ],
            'fill-extrusion-opacity': .6
        }
    });*/
}

function setCulture() {
    const culture = document.documentElement.lang;
    console.info("culture", culture);
    kendo.culture(culture);
}

function featureToHTML(feature) {
    const detail_template_source = $("#detail_template").html();
    /*console.info("featureToHTML", {
        detail_template_source,
        feature,
        etymologies: JSON.parse(feature.properties.etymologies)
    });*/
    const detail_template = kendo.template(detail_template_source);
    return detail_template(feature);
}

$(document).ready(function() {
    setCulture();
    // https://docs.mapbox.com/mapbox-gl-js/example/check-for-support/
    if (!mapboxgl.supported()) {
        alert('Your browser does not support Mapbox GL');
        Sentry.captureMessage("Device/Browser does not support Mapbox GL");
    } else {
        initMap();
    }
});