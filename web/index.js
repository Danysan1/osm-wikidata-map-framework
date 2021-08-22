const defaultBackgroundStyle = 'mapbox://styles/mapbox/streets-v11',
    backgroundStyles = {
        'Streets': 'mapbox://styles/mapbox/streets-v11',
        'Light': 'mapbox://styles/mapbox/light-v10',
        'Dark': 'mapbox://styles/mapbox/dark-v10',
        'Satellite': 'mapbox://styles/mapbox/satellite-v9',
    },
    defaultColorScheme = '#3bb2d0',
    colorSchemes = {
        'Blue': '#3bb2d0',
        'By gender': [
            // https://www.wikidata.org/wiki/Property:P21
            // https://meyerweb.com/eric/tools/color-blend/#3BB2D0:E55E5E:3:hex
            'match', ['get', 'genderID', ['at', 0, ['get', 'etymologies']]],
            'http://www.wikidata.org/entity/Q6581072', '#e55e5e', // female
            'http://www.wikidata.org/entity/Q1052281', '#BB737B', // transgender female
            'http://www.wikidata.org/entity/Q1097630', '#908897', // intersex
            'http://www.wikidata.org/entity/Q2449503', '#669DB4', // transgender male
            'http://www.wikidata.org/entity/Q6581097', '#3bb2d0', // male
            '#223b53' // other
        ],
        'By type': [
            'match', ['get', 'instanceID', ['at', 0, ['get', 'etymologies']]],
            // People
            'http://www.wikidata.org/entity/Q5', '#3bb2d0', // human
            'http://www.wikidata.org/entity/Q21070568', '#3bb2d0', // human who may be fictional
            // Buildings
            'http://www.wikidata.org/entity/Q23413', '#fbb03b', // castle
            'http://www.wikidata.org/entity/Q751876', '#fbb03b', // château
            'http://www.wikidata.org/entity/Q684740', '#fbb03b', // real property
            'http://www.wikidata.org/entity/Q811979', '#fbb03b', // architectural structure
            'http://www.wikidata.org/entity/Q1516079', '#fbb03b', // cultural heritage ensemble
            'http://www.wikidata.org/entity/Q33506', '#fbb03b', // museum
            'http://www.wikidata.org/entity/Q16970', '#fbb03b', // church
            'http://www.wikidata.org/entity/Q233324', '#fbb03b', // seminary
            'http://www.wikidata.org/entity/Q160742', '#fbb03b', // abbey
            'http://www.wikidata.org/entity/Q817056', '#fbb03b', // benedictine abbey
            'http://www.wikidata.org/entity/Q163687', '#fbb03b', // basilica
            'http://www.wikidata.org/entity/Q120560', '#fbb03b', // minor basilica
            'http://www.wikidata.org/entity/Q44613', '#fbb03b', // monastery
            'http://www.wikidata.org/entity/Q1564373', '#fbb03b', // mission complex
            'http://www.wikidata.org/entity/Q179700', '#fbb03b', // statue
            'http://www.wikidata.org/entity/Q1779653', '#fbb03b', // colossal statue
            // Historic events
            'http://www.wikidata.org/entity/Q178561', '#e55e5e', // battle
            'http://www.wikidata.org/entity/Q188055', '#e55e5e', // siege
            'http://www.wikidata.org/entity/Q3199915', '#e55e5e', // massacre
            'http://www.wikidata.org/entity/Q750215', '#e55e5e', // mass murder
            'http://www.wikidata.org/entity/Q891854', '#e55e5e', // bomb attack
            'http://www.wikidata.org/entity/Q898712', '#e55e5e', // aircraft hijacking
            'http://www.wikidata.org/entity/Q217327', '#e55e5e', // suicide attack
            'http://www.wikidata.org/entity/Q2223653', '#e55e5e', // terrorist attack
            'http://www.wikidata.org/entity/Q175331', '#e55e5e', // Demonstration
            // Cities
            'http://www.wikidata.org/entity/Q515', '#fed976', // city
            'http://www.wikidata.org/entity/Q1549591', '#fed976', // big city
            'http://www.wikidata.org/entity/Q702492', '#fed976', // urban area
            'http://www.wikidata.org/entity/Q956214', '#fed976', // chef-lieu
            'http://www.wikidata.org/entity/Q1637706', '#fed976', // million city
            'http://www.wikidata.org/entity/Q747074', '#fed976', // comune of Italy
            'http://www.wikidata.org/entity/Q42744322', '#fed976', // urban municipality of Germany
            'http://www.wikidata.org/entity/Q15105893', '#fed976', // town in Croatia
            'http://www.wikidata.org/entity/Q2264924', '#fed976', // port settlement
            'http://www.wikidata.org/entity/Q15661340', '#fed976', // ancient city
            'http://www.wikidata.org/entity/Q902814', '#fed976', // border town
            'http://www.wikidata.org/entity/Q5119', '#fed976', // capital
            'http://www.wikidata.org/entity/Q2202509', '#fed976', // roman city
            'http://www.wikidata.org/entity/Q3957', '#fed976', // town
            'http://www.wikidata.org/entity/Q486972', '#fed976', // human settlement
            'http://www.wikidata.org/entity/Q4946461', '#fed976', // spa-town
            'http://www.wikidata.org/entity/Q15135589', '#fed976', // religious site
            'http://www.wikidata.org/entity/Q15303838', '#fed976', // municipality seat
            'http://www.wikidata.org/entity/Q123705', '#fed976', // neighborhood
            'http://www.wikidata.org/entity/Q7315416', '#fed976', // residence park
            // Locations
            'http://www.wikidata.org/entity/Q1414991', '#348C31', // area
            'http://www.wikidata.org/entity/Q1620908', '#348C31', // historical region
            'http://www.wikidata.org/entity/Q35657', '#348C31', // U.S. state
            'http://www.wikidata.org/entity/Q23442', '#348C31', // island
            'http://www.wikidata.org/entity/Q8502', '#348C31', // mountain
            'http://www.wikidata.org/entity/Q46831', '#348C31', // mountain range
            'http://www.wikidata.org/entity/Q3777462', '#348C31', // alpine group
            'http://www.wikidata.org/entity/Q54050', '#348C31', // hill
            'http://www.wikidata.org/entity/Q8072', '#348C31', // volcano
            'http://www.wikidata.org/entity/Q169358', '#348C31', // stratovolcano
            'http://www.wikidata.org/entity/Q4421', '#348C31', // forest
            'http://www.wikidata.org/entity/Q570116', '#348C31', // tourist attraction
            'http://www.wikidata.org/entity/Q22698', '#348C31', // park
            // Other
            '#223b53'
        ],
        'Black': '#223b53',
        'Red': '#e55e5e',
        'Orange': '#fbb03b',
    };
console.info({
    thresholdZoomLevel,
    minZoomLevel,
    defaultBackgroundStyle,
    defaultColorScheme,
    default_center_lon,
    default_center_lat,
    default_zoom
});
let map;

/**
 * Let the user choose the map style.
 * 
 * Control implemented as ES6 class
 * @see https://docs.mapbox.com/mapbox-gl-js/api/markers/#icontrol
 **/
class BackgroundStyleControl {

    onAdd(map) {
        this._map = map;

        this._container = document.createElement('div');
        this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl background-style-ctrl';

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

        for (const [text, value] of Object.entries(backgroundStyles)) {
            const option = document.createElement('option');
            option.innerText = text;
            //option.value = value;
            option.value = text;
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
        //const backgroundStyle = event.target.value;
        const backgroundStyle = backgroundStyles[event.target.value];
        console.info("BackgroundStyleControl dropDown click", { event, backgroundStyle });

        this._map.setStyle(backgroundStyle);

        this._ctrlDropDown.className = 'hiddenDropDown';
        //updateDataSource(event);
    }

}

/**
 * Let the user choose a color scheme
 * 
 * Control implemented as ES6 class
 * @see https://docs.mapbox.com/mapbox-gl-js/api/markers/#icontrol
 * @see https://docs.mapbox.com/mapbox-gl-js/example/data-driven-circle-colors/
 * @see https://docs.mapbox.com/mapbox-gl-js/example/color-switcher/
 * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map#setpaintproperty
 **/
class EtymologyColorControl {

    onAdd(map) {
        this._map = map;

        this._container = document.createElement('div');
        this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl etymology-color-ctrl';

        const table = document.createElement('table');
        this._container.appendChild(table);

        const tr = document.createElement('tr');
        table.appendChild(tr);

        const td1 = document.createElement('td'),
            td2 = document.createElement('td');
        tr.appendChild(td1);
        tr.appendChild(td2);

        const ctrlBtn = document.createElement('button');
        ctrlBtn.className = 'etymology-color-ctrl-button';
        ctrlBtn.title = 'Choose color scheme';
        ctrlBtn.textContent = '🎨';
        // https://stackoverflow.com/questions/36489579/this-within-es6-class-method
        ctrlBtn.onclick = this.btnClickHandler.bind(this);
        td2.appendChild(ctrlBtn);

        this._ctrlDropDown = document.createElement('select');
        this._ctrlDropDown.className = 'hiddenDropDown';
        this._ctrlDropDown.title = 'Color scheme';
        this._ctrlDropDown.onchange = this.dropDownClickHandler.bind(this);
        td1.appendChild(this._ctrlDropDown);

        for (const [text, value] of Object.entries(colorSchemes)) {
            const option = document.createElement('option');
            option.innerText = text;
            //option.value = value;
            option.value = text;
            if (value === defaultColorScheme) {
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
        console.info("EtymologyColorControl button click", event);
        this._ctrlDropDown.className = 'visibleDropDown';
    }

    dropDownClickHandler(event) {
        //const colorScheme = event.target.value;
        const colorScheme = colorSchemes[event.target.value];
        console.info("EtymologyColorControl dropDown click", { event, colorScheme });

        [
            ["wikidata_layer_point", "circle-color"],
            ["wikidata_layer_lineString", 'line-color'],
            ["wikidata_layer_polygon", 'fill-color'],
        ].forEach(([layerID, property]) => {
            if (this._map.getLayer(layerID)) {
                this._map.setPaintProperty(layerID, property, colorScheme);
            }
        });

        this._ctrlDropDown.className = 'hiddenDropDown';
        //updateDataSource(event);
    }

}

/**
 * Show the error snackbar
 * 
 * @see https://www.w3schools.com/howto/howto_js_snackbar.asp
 */
function showSnackbar(message, color = "lightcoral") {
    var x = document.getElementById("snackbar");
    x.className = "show";
    x.innerText = message;
    x.style = "background-color:" + color;
    // After 3 seconds, remove the show class from DIV
    setTimeout(function() { x.className = x.className.replace("show", ""); }, 3000);
}

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
    //console.info('sourcedata event', { type: e.dataType, wikidataSourceEvent, overpassSourceEvent, ready, e });

    if (ready) {
        //console.info('sourcedata ready event', { wikidataSourceEvent, overpassSourceEvent, e });
        if (wikidataSourceEvent || overpassSourceEvent) {
            //kendo.ui.progress($("#map"), false);
        } else {
            updateDataSource(e);
        }
    }
}

function mapErrorHandler(err) {
    console.trace('Map error: ', err);
    if ((err.sourceId == "overpass_source" || err.sourceId == "wikidata_source") && err.error.status > 200) {
        showSnackbar("An error occurred while fetching the data.");
    } else {
        showSnackbar("A map error occurred.");
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
        minLat = Math.round(southWest.lat * 1000) / 1000,
        minLon = Math.round(southWest.lng * 1000) / 1000,
        northEast = bounds.getNorthEast(),
        maxLat = Math.round(northEast.lat * 1000) / 1000,
        maxLon = Math.round(northEast.lng * 1000) / 1000,
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
        showSnackbar("Fetching data...", "lightblue");
        if (wikidata_source) {
            wikidata_source.setData(wikidata_url);
        } else {
            prepareWikidataLayers(wikidata_url);
        }
    } else if (zoomLevel < minZoomLevel) {
        showSnackbar("Please zoom more to see data", "orange");
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

    /*map.addLayer({
        'id': 'wikidata_layer_point',
        'source': 'wikidata_source',
        'type': 'circle',
        "filter": ["==", ["geometry-type"], "Point"],
        "minzoom": thresholdZoomLevel,
        'paint': {
            'circle-radius': 8,
            'circle-stroke-width': 2,
            'circle-color': defaultColorScheme,
            'circle-stroke-color': 'white'
        }
    });*/

    map.addLayer({
        'id': 'wikidata_layer_lineString',
        'source': 'wikidata_source',
        'type': 'line',
        "filter": ["==", ["geometry-type"], "LineString"],
        "minzoom": thresholdZoomLevel,
        'paint': {
            'line-color': defaultColorScheme,
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
            'fill-color': defaultColorScheme,
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

    setTimeout(() => map.addControl(new EtymologyColorControl()), 1000);
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
        minzoom: minZoomLevel,
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
        minzoom: minZoomLevel,
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
        minzoom: minZoomLevel,
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
    const lat = Math.round(map.getCenter().lat * 1000) / 1000,
        lon = Math.round(map.getCenter().lng * 1000) / 1000,
        zoom = Math.round(map.getZoom() * 10) / 10;
    window.location.hash = "#" + lon + "," + lat + "," + zoom;
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

    map.on('error', mapErrorHandler);
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