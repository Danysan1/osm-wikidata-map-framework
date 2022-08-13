/* global mapboxgl mapbox_gl_token MapboxLanguage MapboxGeocoder Sentry Chart thresholdZoomLevel minZoomLevel defaultBackgroundStyle defaultColorScheme default_center_lon default_center_lat default_zoom */
const backgroundStyles = {
        streets: { text: 'Streets', style: 'mapbox://styles/mapbox/streets-v11' },
        light: { text: 'Light', style: 'mapbox://styles/mapbox/light-v10' },
        dark: { text: 'Dark', style: 'mapbox://styles/mapbox/dark-v10' },
        //satellite: { text: 'Satellite', style: 'mapbox://styles/mapbox/satellite-v9' }, // Not compatible with MapboxLanguage 
        hybrid: { text: 'Satellite', style: 'mapbox://styles/mapbox/satellite-streets-v11' },
        outdoors: { text: 'Outdoors', style: 'mapbox://styles/mapbox/outdoors-v11' },
    },
    colorSchemes = {
        blue: { text: 'Uniform blue', color: '#3bb2d0', legend: null },
        gender: {
            colorField: 'gender_color',
            text: 'By gender',
            color: ["coalesce", ['get', 'gender_color'], "#223b53"],
            urlCode: "genderStats",
        },
        type: {
            colorField: 'type_color',
            text: 'By type',
            color: ["coalesce", ['get', 'type_color'], "#223b53"],
            urlCode: "typeStats",
        },
        black: { text: 'Uniform black', color: '#223b53', legend: null },
        red: { text: 'Uniform red', color: '#e55e5e', legend: null },
        orange: { text: 'Uniform orange', color: '#fbb03b', legend: null },
    };

/**
 * 
 * @param {string} message 
 * @param {string} level Log level (default "error")
 * @param {object} extra 
 */
function logErrorMessage(message, level = "error", extra = undefined) {
    console.error(message, extra);
    if (typeof Sentry != 'undefined') {
        if (extra instanceof Error)
            Sentry.captureException(extra, { level, extra: message });
        else
            Sentry.captureMessage(message, { level, extra });
    }
}

/**
 * @typedef {Object} FragmentParams
 * @property {number?} lon
 * @property {number?} lat
 * @property {number?} zoom
 * @property {string?} colorScheme
 */

/**
 * Gets the parameters passed through the fragment
 * 
 * @returns {FragmentParams} Parameters passed through the fragment
 */
function getFragmentParams() {
    const hashParams = window.location.hash ? window.location.hash.substring(1).split(",") : null,
        out = {
            lon: (hashParams && hashParams[0] && !isNaN(parseFloat(hashParams[0]))) ? parseFloat(hashParams[0]) : undefined,
            lat: (hashParams && hashParams[1] && !isNaN(parseFloat(hashParams[1]))) ? parseFloat(hashParams[1]) : undefined,
            zoom: (hashParams && hashParams[2] && !isNaN(parseFloat(hashParams[2]))) ? parseFloat(hashParams[2]) : undefined,
            colorScheme: (hashParams && hashParams[3]) ? hashParams[3] : undefined,
        };
    //console.info("getFragmentParams", hashParams, out);
    return out;
}

/**
 * If a parameter is !== undefined it is updated in the fragment.
 * If it is === is left untouched
 * 
 * @param {number?} lon
 * @param {number?} lat
 * @param {number?} zoom
 * @param {string?} colorScheme
 * @returns {string} The fragment actually set
 */
function setFragmentParams(lon, lat, zoom, colorScheme) {
    const currentParams = getFragmentParams()
    let p = currentParams;

    if (lon !== undefined) p.lon = lon.toFixed(3);
    if (lat !== undefined) p.lat = lat.toFixed(3);
    if (zoom !== undefined) p.zoom = zoom.toFixed(1);
    if (colorScheme !== undefined) p.colorScheme = colorScheme;

    const fragment = "#" + p.lon + "," + p.lat + "," + p.zoom + "," + p.colorScheme;
    window.location.hash = fragment;
    console.info("setFragmentParams", currentParams, p, fragment);
    return fragment;
}

console.info("start", {
    thresholdZoomLevel,
    minZoomLevel,
    defaultBackgroundStyle,
    defaultColorScheme,
    default_center_lon,
    default_center_lat,
    default_zoom
});

let colorControl;

/**
 * Opens the information intro window
 * 
 * @param {mapboxgl.Map} map 
 */
function openIntroWindow(map) {
    new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: true,
            closeOnMove: true,
            maxWidth: 'none',
            className: "oem_info_popup"
        }).setLngLat(map.getBounds().getNorthWest())
        .setDOMContent(document.getElementById("intro").cloneNode(true))
        .addTo(map);
}

document.addEventListener("DOMContentLoaded", initPage);

/**
 * Let the user re-open the info window.
 * 
 * Control implemented as ES6 class
 * @see https://docs.mapbox.com/mapbox-gl-js/api/markers/#icontrol
 */
class InfoControl {
    onAdd(map) {
        const container = document.createElement('div');
        container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl info-ctrl';

        const ctrlBtn = document.createElement('button');
        ctrlBtn.className = 'info-ctrl-button';
        ctrlBtn.title = 'Info about Open Etymology Map';
        ctrlBtn.textContent = 'ℹ️';
        ctrlBtn.onclick = () => openIntroWindow(map);
        container.appendChild(ctrlBtn);

        return container;
    }
}

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
        this._ctrlDropDown.className = 'hiddenElement';
        this._ctrlDropDown.title = 'Background style';
        this._ctrlDropDown.onchange = this.dropDownClickHandler.bind(this);
        td1.appendChild(this._ctrlDropDown);

        for (const [name, style] of Object.entries(backgroundStyles)) {
            const option = document.createElement('option');
            option.innerText = style.text;
            option.value = name;
            if (name === defaultBackgroundStyle) {
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
        const backgroundStyleObj = backgroundStyles[event.target.value];
        console.info("BackgroundStyleControl dropDown click", { backgroundStyleObj, event });
        if (backgroundStyleObj) {
            this._map.setStyle(backgroundStyleObj.style);
            this._ctrlDropDown.className = 'hiddenElement';
            setCulture();
            //updateDataSource(event);
        } else {
            logErrorMessage("Invalid selected background style", "error", { style: event.target.value });
        }
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
 * @see https://docs.mapbox.com/help/tutorials/choropleth-studio-gl-pt-1/
 * @see https://docs.mapbox.com/help/tutorials/choropleth-studio-gl-pt-2/
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
        /*td2.appendChild(ctrlBtn);
        td2.className = 'button-cell';*/
        td1.appendChild(ctrlBtn);
        td1.className = 'button-cell';

        this._ctrlDropDown = document.createElement('select');
        //this._ctrlDropDown.className = 'hiddenElement';
        this._ctrlDropDown.className = 'visibleDropDown';
        this._ctrlDropDown.title = 'Color scheme';
        this._ctrlDropDown.onchange = this.dropDownClickHandler.bind(this);
        /*td1.appendChild(this._ctrlDropDown);
        td1.className = 'dropdown-cell';*/
        td2.appendChild(this._ctrlDropDown);
        td2.className = 'dropdown-cell';

        for (const [value, scheme] of Object.entries(colorSchemes)) {
            const option = document.createElement('option');
            option.innerText = scheme.text;
            option.value = value;
            if (value === getCorrectFragmentParams().colorScheme) {
                option.selected = true;
            }
            this._ctrlDropDown.appendChild(option);
        }
        this._ctrlDropDown.dispatchEvent(new Event("change"))

        //setFragmentParams(undefined, undefined, undefined, defaultColorScheme); //! Creates a bug when using geo-localization or location search

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

    /**
     * @returns {string} The current color scheme
     */
    getColorScheme() {
        return this._ctrlDropDown?.value;
    }

    /**
     * @param {string} colorScheme 
     * @returns {void}
     */
    setColorScheme(colorScheme) {
        console.info("EtymologyColorControl setColorScheme", {colorScheme});
        this._ctrlDropDown.options.forEach(option => {
            if (option.value === colorScheme) {
                option.selected = true;
                this._ctrlDropDown.dispatchEvent(new Event("change"));
                return;
            }
        });
        console.error("EtymologyColorControl setColorScheme: invalid color scheme", {colorScheme});
    }

    /**
     * 
     * @param {Event} event
     * @returns {void}
     */
    dropDownClickHandler(event) {
        const colorScheme = event.target.value,
            colorSchemeObj = colorSchemes[colorScheme];
        let color;

        if (colorSchemeObj) {
            color = colorSchemeObj.color;
        } else {
            logErrorMessage("Invalid selected color scheme", "error", { colorScheme });
            color = '#3bb2d0';
        }
        console.info("EtymologyColorControl dropDown click", { event, colorScheme, colorSchemeObj, color });

        [
            ["wikidata_layer_point", "circle-color"],
            ["wikidata_layer_lineString", 'line-color'],
            ["wikidata_layer_polygon_fill", 'fill-color'],
            ["wikidata_layer_polygon_border", 'line-color'],
        ].forEach(([layerID, property]) => {
            if (this._map.getLayer(layerID)) {
                this._map.setPaintProperty(layerID, property, color);
            } else {
                console.warn("Layer does not exist, can't set property", { layerID, property, color });
            }
        });

        this.updateChart(event);

        setFragmentParams(undefined, undefined, undefined, colorScheme);
        //updateDataSource(event);
    }

    /**
     * @param {Event} event
     * @returns {void}
     */
    updateChart(event) {
        if (!this._ctrlDropDown) {
            logErrorMessage("EtymologyColorControl updateChart: dropodown not inizialized");
            return;
        }

        const colorScheme = colorSchemes[this._ctrlDropDown.value],
            map = event.target, 
            bounds = map.getBounds ? map.getBounds() : null;
        //console.info("updateChart", { event, colorScheme });

        if (!bounds) {
            //console.warn("EtymologyColorControl updateChart: missing bounds");
        } else if (colorScheme && colorScheme.urlCode) {
            let data = {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [],
                }]
            };

            console.info("updateChart main: URL code", { colorScheme });
            if (this._chartXHR)
                this._chartXHR.abort();

            const southWest = bounds.getSouthWest(),
                minLat = southWest.lat,
                minLon = southWest.lng,
                northEast = bounds.getNorthEast(),
                maxLat = northEast.lat,
                maxLon = northEast.lng,
                language = document.documentElement.lang,
                queryParams = {
                    from: "bbox",
                    to: colorScheme.urlCode,
                    minLat: Math.floor(minLat*1000)/1000, // 0.1234 => 0.124 
                    minLon: Math.floor(minLon*1000)/1000,
                    maxLat: Math.ceil(maxLat*1000)/1000, // 0.1234 => 0.123
                    maxLon: Math.ceil(maxLon*1000)/1000,
                    language,
                },
                queryString = new URLSearchParams(queryParams).toString(),
                stats_url = './stats.php?' + queryString,
                xhr = new XMLHttpRequest();
            xhr.onreadystatechange = (e) => {
                const readyState = xhr.readyState,
                    status = xhr.status;
                if (readyState == XMLHttpRequest.DONE) {
                    if (status == 200) {
                        JSON.parse(xhr.responseText).forEach(row => {
                            data.datasets[0].backgroundColor.push(row.color);
                            data.labels.push(row["name"]);
                            data.datasets[0].data.push(row["count"]);
                        });
                        this.setChartData(data);
                    } else if (readyState == XMLHttpRequest.UNSENT || status == 0) {
                        console.info("XHR aborted", { xhr, readyState, status, e });
                    } else {
                        console.error("XHR error", { xhr, readyState, status, e });
                        //if (event.type && event.type == 'change')
                        //    this._ctrlDropDown.className = 'hiddenElement';
                        this.removeChart();
                    }
                }
            }
            xhr.open('GET', stats_url, true);
            xhr.send();
            this._chartXHR = xhr;
        } else {
            if (event.type && event.type == 'change')
                this._ctrlDropDown.className = 'hiddenElement';
            this.removeChart();
        }
    }

    createChartFromLegend(legend) {
        let data = {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
            }]
        };
        legend.forEach(row => {
            data.datasets[0].backgroundColor.push(row[0]);
            data.labels.push(row[1]);
            data.datasets[0].data.push(0); // dummy data
        });
        this.setChartData(data);
    }

    setChartData(data) {
        console.info("setChartData", {
            container: this._container,
            chartElement: this._chartElement,
            chartObject: this._chartObject,
            data
        });
        if (this._chartObject && this._chartElement) {
            // https://www.chartjs.org/docs/latest/developers/updates.html
            this._chartObject.data.datasets[0].backgroundColor = data.datasets[0].backgroundColor;
            this._chartObject.data.labels = data.labels;
            this._chartObject.data.datasets[0].data = data.datasets[0].data;

            this._chartObject.update();
        } else if (typeof Chart == "undefined" || !Chart) {
            alert('There was an error while loading Chart.js (the library needed to create the chart)');
            logErrorMessage("Undefined Chart (chart.js error)");
        } else {
            //this._legend.className = 'legend';
            this._chartElement = document.createElement('canvas');
            this._chartElement.className = 'chart';
            this._container.appendChild(this._chartElement);
            const ctx = this._chartElement.getContext('2d');
            this._chartObject = new Chart(ctx, {
                type: "pie",
                data: data,
                options: {
                    animation: {
                        animateScale: true,
                    }
                }
            });
        }
    }

    removeChart() {
        if (this._chartElement) {
            try {
                this._container.removeChild(this._chartElement);
                this._chartElement = undefined;
                this._chartObject = undefined;
            } catch (error) {
                console.warn("Error removing old chart", { error, container: this._container, chart: this._chartElement });
            }
        }
    }
}

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
        setTimeout(function() { x.className = x.className.replace("show", ""); }, timeout);
    }
    return x;
}

/**
 * @typedef {Object} CorrectFragmentParams
 * @property {number} lon
 * @property {number} lat
 * @property {number} zoom
 * @property {string} colorScheme
 */

/**
 * 
 * @returns {CorrectFragmentParams}
 */
function getCorrectFragmentParams() {
    let p = getFragmentParams();
    if (p.lat < -90 || p.lat > 90) {
        console.error("Invalid latitude", p.lat);
        p.lat = undefined;
    }

    if (p.lon === undefined || p.lat === undefined || p.zoom === undefined) {
        console.info("getCorrectFragmentParams: using default position", { p, default_center_lon, default_center_lat, default_zoom });
        p.lon = default_center_lon;
        p.lat = default_center_lat;
        p.zoom = default_zoom;
    }

    if(p.colorScheme === undefined) {
        console.info("getCorrectFragmentParams: using default color scheme", { p, defaultColorScheme });
        p.colorScheme = defaultColorScheme;
    }

    return p;
}

/**
 * Initializes the static map preview
 * 
 * @see https://docs.mapbox.com/help/tutorials/improve-perceived-performance-with-static/
 * @see https://docs.mapbox.com/api/maps/static-images/
 * @see https://docs.mapbox.com/api/maps/static-images/#static-images-api-errors
 */
function initMapPreview() {
    try {
        console.info("initMapPreview: Initializing the map preview");
        const startPosition = getCorrectFragmentParams(),
            lon = startPosition.lon,
            lat = startPosition.lat,
            zoom = startPosition.zoom,
            map_static_preview = document.getElementById('map_static_preview'),
            width = map_static_preview.clientWidth,
            height = map_static_preview.clientHeight,
            maxDimension = Math.max(width, height),
            rescaleFactor = maxDimension <= 1280 ? 1 : 1280 / maxDimension,
            trueWidth = Math.trunc(width * rescaleFactor),
            trueHeight = Math.trunc(height * rescaleFactor),
            //imgURL = 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/-85.757,38.25,10/600x400?access_token=' + mapbox_gl_token;
            imgURL = 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/' + lon + ',' + lat + ',' + zoom + '/' + trueWidth + 'x' + trueHeight + '?access_token=' + mapbox_gl_token;
        console.info("Initializing the map preview", { startPosition, width, height, imgURL });

        map_static_preview.src = imgURL;
        map_static_preview.style.visibility = 'visible';
        document.getElementById('map').style.visibility = 'hidden';
    } catch (e) {
        console.error("initMapPreview: failed initializing the map preview", e);
    }
}

/**
 * Initializes the map
 */
function initMap() {
    mapboxgl.accessToken = mapbox_gl_token;
    const startParams = getCorrectFragmentParams(),
        backgroundStyleObj = backgroundStyles[defaultBackgroundStyle];
    console.info("Initializing the map", { startParams, backgroundStyleObj });
    let map, backgroundStyle;
    if (backgroundStyleObj) {
        backgroundStyle = backgroundStyleObj.style;
    } else {
        logErrorMessage("Invalid default background style", "error", { defaultBackgroundStyle });
        backgroundStyle = "mapbox://styles/mapbox/streets-v11";
    }

    // https://docs.mapbox.com/mapbox-gl-js/example/mapbox-gl-rtl-text/
    mapboxgl.setRTLTextPlugin(
        './node_modules/@mapbox/mapbox-gl-rtl-text/mapbox-gl-rtl-text.min.js',
        err => err ? console.error("Error loading mapbox-gl-rtl-text", err) : console.info("mapbox-gl-rtl-text loaded"),
        true // Lazy load the plugin
    );

    map = new mapboxgl.Map({
        container: 'map',
        style: backgroundStyle,
        center: [startParams.lon, startParams.lat], // starting position [lon, lat]
        zoom: startParams.zoom, // starting zoom
    });
    openIntroWindow(map);

    map.on('load', mapLoadedHandler);
    map.on('styledata', mapStyleDataHandler);

    setFragmentParams(startParams.lon, startParams.lat, startParams.zoom, startParams.colorScheme);
    window.addEventListener('hashchange', (e) => hashChangeHandler(e, map), false);

    try {
        map.addControl(new MapboxLanguage({
            defaultLanguage: document.documentElement.lang.substring(0, 2)
        }));
    } catch (err) {
        logErrorMessage("Failed setting up mapbox-gl-language", "warn", err);
    }
}

/**
 * 
 * @param {MapDataEvent} e The event to handle 
 */
function mapStyleDataHandler(e) {
    console.info("Map style data loaded", e);
    //setCulture();
}

/**
 * Handles the change of fragment data
 * 
 * @param {HashChangeEvent} e The event to handle 
 * @param {mapboxgl.Map} map 
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

    if(currColorScheme != newParams.colorScheme)
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
        ready = e.isSourceLoaded;
    /*if (wikidataSourceEvent || overpassSourceEvent || ready) {
        console.info('sourcedata event', {
            type: e.dataType,
            source: e.sourceId,
            wikidataSourceEvent,
            overpassSourceEvent,
            ready,
            e
        });
    }*/

    if (ready) {
        if (wikidataSourceEvent || overpassSourceEvent) {
            //kendo.ui.progress($("#map"), false);
            showSnackbar("Data loaded", "lightgreen");
            if (wikidataSourceEvent && colorControl) {
                colorControl.updateChart(e);
            }
        } else {
            updateDataSource(e);
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
                minLat: Math.floor(minLat*1000)/1000, // 0.1234 => 0.124 
                minLon: Math.floor(minLon*1000)/1000,
                maxLat: Math.ceil(maxLat*1000)/1000, // 0.1234 => 0.123
                maxLon: Math.ceil(maxLon*1000)/1000,
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
                minLat: Math.floor(minLat*10)/10, // 0.1234 => 0.2
                minLon: Math.floor(minLon*10)/10,
                maxLat: Math.ceil(maxLat*10)/10, // 0.1234 => 0.1
                maxLon: Math.ceil(maxLon*10)/10,
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
            queryParams,
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
 * @param {mapboxgl.Map} map
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
        colorControl = new EtymologyColorControl();
        map.currentEtymologyColorControl = colorControl;
        setTimeout(() => map.addControl(colorControl, 'top-left'), 100); // Delay needed to make sure the dropdown is always under the search bar
    }
}

/**
 * Completes low-level details of the high zoom Wikidata layer
 * 
 * @param {mapboxgl.Map} map
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
            popup = new mapboxgl.Popup({
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
 * @param {mapboxgl.Map} map
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
 * @param {mapboxgl.Map} map
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
    const sourceName = prefix+'_source',
        clusterLayerName = prefix+'_layer_cluster',
        countLayerName = prefix+'_layer_count',
        pointLayerName = prefix+'_layer_point';
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
        console.info("prepareClusteredLayers "+sourceName, {maxZoom, source: map.getSource(sourceName)});
    }

    if (!map.getLayer(clusterLayerName)) {
        map.addLayer({
            id: clusterLayerName,
            source: sourceName,
            type: 'circle',
            maxzoom: maxZoom,
            minzoom: minZoom,
            filter: ['has', countFieldName],
            paint: clusterPaintFromField(countFieldName),
        });
        

        // inspect a cluster on click
        map.on('click', clusterLayerName, (e) => {
            const features = map.queryRenderedFeatures(e.point, {
                    layers: [clusterLayerName]
                }),
                clusterId = features[0].properties.cluster_id,
                center = features[0].geometry.coordinates;
            console.info('Click '+clusterLayerName, features, clusterId, center);
            map.getSource(sourceName).getClusterExpansionZoom(
                clusterId, (err, zoom) => easeToClusterCenter(map, err, zoom, maxZoom + 0.5, center)
            );
        });

        map.on('mouseenter', clusterLayerName, () => map.getCanvas().style.cursor = 'pointer');
        map.on('mouseleave', clusterLayerName, () => map.getCanvas().style.cursor = '');

        console.info("prepareClusteredLayers "+clusterLayerName, {minZoom, maxZoom, layer: map.getLayer(clusterLayerName)});
    }

    if (!map.getLayer(countLayerName)) {
        map.addLayer({
            id: countLayerName,
            type: 'symbol',
            source: sourceName,
            maxzoom: maxZoom,
            minzoom: minZoom,
            filter: ['has', countShowFieldName],
            layout: {
                'text-field': '{'+countShowFieldName+'}',
                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                'text-size': 12
            }
        });
        console.info("prepareClusteredLayers "+countLayerName, {minZoom, maxZoom, layer: map.getLayer(countLayerName)});
    }

    if (!map.getLayer(pointLayerName)) {
        map.addLayer({
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
        });

        map.on('click', pointLayerName, (e) => {
            const features = map.queryRenderedFeatures(e.point, {
                    layers: [pointLayerName]
                }),
                center = features[0].geometry.coordinates;
            console.info('Click '+pointLayerName, features, center);
            map.easeTo({
                center: center,
                zoom: maxZoom + 0.5
            });
        });

        map.on('mouseenter', pointLayerName, () => map.getCanvas().style.cursor = 'pointer');
        map.on('mouseleave', pointLayerName, () => map.getCanvas().style.cursor = '');
        
        console.info("prepareClusteredLayers "+pointLayerName, {minZoom, maxZoom, layer: map.getLayer(pointLayerName)});
    }
}

/**
 * Callback for getClusterExpansionZoom which eases the map to the cluster center at the calculated zoom
 * 
 * @param {mapboxgl.Map} map
 * @param {*} err 
 * @param {number} zoom
 * @param {number} defaultZoom Default zoom, in case the calculated one is empty (for some reason sometimes it happens)
 * @param {mapboxgl.LngLatLike} center
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
 * Handles the completion of map loading
 * 
 * @param {Event} e 
 */
function mapLoadedHandler(e) {
    console.info("mapLoadedHandler", e);
    const map = e.target;

    document.getElementById('map').style.visibility = 'visible';
    document.getElementById('map_static_preview').style.visibility = 'hidden';

    setCulture();
    //openIntroWindow(map);

    mapMoveEndHandler(e);
    // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:idle
    //map.on('idle', updateDataSource); //! Called continuously, avoid
    // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:moveend
    map.on('moveend', mapMoveEndHandler);
    // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:zoomend
    //map.on('zoomend', updateDataSource); // moveend is sufficient

    // https://docs.mapbox.com/mapbox-gl-js/example/mapbox-gl-geocoder/
    map.addControl(new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        collapsed: true,
        mapboxgl: mapboxgl
    }), 'top-left');

    // https://docs.mapbox.com/mapbox-gl-js/api/markers/#navigationcontrol
    map.addControl(new mapboxgl.NavigationControl({
        visualizePitch: true
    }), 'top-right');

    // https://docs.mapbox.com/mapbox-gl-js/api/markers/#attributioncontrol
    /*map.addControl(new mapboxgl.AttributionControl({
        customAttribution: 'Etymology: <a href="https://www.wikidata.org/wiki/Wikidata:Introduction">Wikidata</a>'
    }), 'bottom-left');*/

    // https://docs.mapbox.com/mapbox-gl-js/example/locate-user/
    // Add geolocate control to the map.
    map.addControl(new mapboxgl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        // When active the map will receive updates to the device's location as it changes.
        trackUserLocation: false,
        // Draw an arrow next to the location dot to indicate which direction the device is heading.
        showUserHeading: true
    }), 'top-right');

    // https://docs.mapbox.com/mapbox-gl-js/api/markers/#scalecontrol
    map.addControl(new mapboxgl.ScaleControl({
        maxWidth: 80,
        unit: 'metric'
    }), 'bottom-left');
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    map.addControl(new BackgroundStyleControl(), 'top-right');
    map.addControl(new InfoControl(), 'top-right');

    map.on('sourcedata', mapSourceDataHandler);

    map.on('error', mapErrorHandler);

    //prepareGlobalLayers(map);
}

/**
 * Initializes the low-zoom-level clustered layer.
 * 
 * @param {mapboxgl.Map} map
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
 * Set the application culture for i18n & l10n
 * 
 * @see https://docs.mapbox.com/mapbox-gl-js/example/language-switch/
 * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map#setlayoutproperty
 */
function setCulture() {
    const culture = document.documentElement.lang,
        language = culture.substring(0, 2),
        nameProperty = [
            //'coalesce', ['get', 'name_' + language], ['get', `name`]
            'get', 'name_' + language
        ];
    console.info("setCulture", { culture, language, nameProperty });

    /*if (!map) {
        console.warn("Empty map, can't change map language");
    } else {
        //Already handled by mapbox-gl-language constructor
        map.setLayoutProperty('country-label', 'text-field', nameProperty);
        map.setLayoutProperty('road-label', 'text-field', nameProperty);
        map.setLayoutProperty('settlement-label', 'text-field', nameProperty);
        map.setLayoutProperty('poi-label', 'text-field', nameProperty);
    }*/

    //kendo.culture(culture);
}

/**
 * 
 * @param {any} feature 
 * @return {Node}
 */
function featureToDomElement(feature) {
    const etymologies = JSON.parse(feature.properties.etymologies),
        detail_template = document.getElementById('detail_template'),
        detail_container = detail_template.content.cloneNode(true),
        //template_container = document.createDocumentFragment(),
        element_wikipedia_button = detail_container.querySelector('.element_wikipedia_button'),
        element_commons_button = detail_container.querySelector('.element_commons_button'),
        element_osm_button = detail_container.querySelector('.element_osm_button'),
        element_mapcomplete_button = detail_container.querySelector('.element_mapcomplete_button'),
        element_location_button = detail_container.querySelector('.element_location_button'),
        etymologies_container = detail_container.querySelector('.etymologies_container'),
        osm_full_id = feature.properties.osm_type + '/' + feature.properties.osm_id,
        mapcomplete_url = 'https://mapcomplete.osm.be/etymology.html#' + osm_full_id,
        osm_url = 'https://www.openstreetmap.org/' + osm_full_id;
    //template_container.appendChild(detail_container);
    console.info("featureToDomElement", {
        el_id: feature.properties.el_id,
        feature,
        etymologies,
        detail_container,
        etymologies_container
    });

    if (feature.properties.name) {
        detail_container.querySelector('.element_name').innerText = '📍 ' + feature.properties.name;
    }

    if (!element_wikipedia_button) {
        console.warn("Missing element_wikipedia_button");
    } else if (feature.properties.wikipedia) {
        element_wikipedia_button.href = 'https://www.wikipedia.org/wiki/' + feature.properties.wikipedia;
        element_wikipedia_button.style.display = 'inline-flex';
    } else {
        element_wikipedia_button.style.display = 'none';
    }

    if (!element_commons_button) {
        console.warn("Missing element_commons_button");
    } else if (feature.properties.commons) {
        element_commons_button.href = 'https://commons.wikimedia.org/wiki/' + feature.properties.commons;
        element_commons_button.style.display = 'inline-flex';
    } else {
        element_commons_button.style.display = 'none';
    }

    if (!element_osm_button) {
        console.warn("Missing element_osm_button");
    } else {
        element_osm_button.href = osm_url;
    }
    
    if (!element_mapcomplete_button) {
        console.warn("Missing element_mapcomplete_button");
    } else {
        element_mapcomplete_button.href = mapcomplete_url;
    }

    if(!element_location_button) {
        console.warn("Missing element_location_button");
    } else {
        let coord = feature.geometry.coordinates;
        while (Array.isArray(coord) && Array.isArray(coord[0])) {
            coord = coord[0];
        }
        element_location_button.href = "#" + coord[0] + "," + coord[1] + ",18";
    }

    etymologies.filter(x => x != null).forEach(function(ety) {
        try {
            etymologies_container.appendChild(etymologyToDomElement(ety))
        } catch (e) {
            logErrorMessage("Failed adding", "error", e);
        }
    });
    return detail_container;
}

function etymologyToDomElement(ety) {
    const etymology_template = document.getElementById('etymology_template'),
        etyDomElement = etymology_template.content.cloneNode(true),
        etymology_description = etyDomElement.querySelector('.etymology_description'),
        wikipedia_button = etyDomElement.querySelector('.wikipedia_button'),
        commons_button = etyDomElement.querySelector('.commons_button'),
        location_button = etyDomElement.querySelector('.subject_location_button'),
        start_end_date = etyDomElement.querySelector('.start_end_date'),
        event_place = etyDomElement.querySelector('.event_place'),
        citizenship = etyDomElement.querySelector('.citizenship'),
        gender = etyDomElement.querySelector('.gender'),
        occupations = etyDomElement.querySelector('.occupations'),
        prizes = etyDomElement.querySelector('.prizes'),
        pictures = etyDomElement.querySelector('.pictures');

    etyDomElement.querySelector('.etymology_name').innerText = ety.name;

    if (ety.description) {
        etymology_description.innerText = ety.description;
    } else {
        etymology_description.style.display = 'none';
    }

    etyDomElement.querySelector('.wikidata_button').href = 'https://www.wikidata.org/wiki/' + ety.wikidata;

    if (ety.wikipedia) {
        wikipedia_button.href = ety.wikipedia;
        wikipedia_button.style.display = 'inline-flex';
    } else {
        wikipedia_button.style.display = 'none';
    }

    if (ety.commons) {
        commons_button.href = "https://commons.wikimedia.org/wiki/Category:" + ety.commons;
        commons_button.style.display = 'inline-flex';
    } else {
        commons_button.style.display = 'none';
    }

    let coords = null,
        coordsOk = false;
    if (ety.wkt_coords) {
        coords = /Point\(([-\d.]+) ([-\d.]+)\)/i.exec(ety.wkt_coords);
        coordsOk = coords && coords.length > 1 && coords.at;
        if (!coordsOk)
            console.warn("Failed converting wkt_coords:", { et_id: ety.et_id, coords, wkt_coords: ety.wkt_coords });
    }
    if (coordsOk) {
        location_button.href = "#" + coords.at(1) + "," + coords.at(2) + ",12.5";
        location_button.style.display = 'inline-flex';
    } else {
        location_button.style.display = 'none';
    }

    if (ety.birth_date || ety.birth_place || ety.death_date || ety.death_place) {
        const birth_date = ety.birth_date ? formatDate(ety.birth_date, ety.birth_date_precision) : "?",
            birth_place = ety.birth_place ? ety.birth_place : "?",
            death_date = ety.death_date ? formatDate(ety.death_date, ety.death_date_precision) : "?",
            death_place = ety.death_place ? ety.death_place : "?";
        start_end_date.innerText = `📅 ${birth_date} (${birth_place}) - ${death_date} (${death_place})`;
    } else if (ety.start_date || ety.end_date) {
        const start_date = ety.start_date ? formatDate(ety.start_date, ety.start_date_precision) : "?",
            end_date = ety.end_date ? formatDate(ety.end_date, ety.end_date_precision) : "?";
        start_end_date.innerText = `📅 ${start_date} - ${end_date}`;
    } else if (ety.event_date) {
        const event_date = formatDate(ety.event_date, ety.event_date_precision);
        start_end_date.innerText = `📅 ${event_date}`
    } else {
        start_end_date.style.display = 'none';
    }
    if (ety.event_place) {
        event_place.innerText = '📍 ' + ety.event_place;
    } else {
        event_place.style.display = 'none';
    }

    if (ety.citizenship) {
        citizenship.innerText = '🌍 ' + ety.citizenship;
    } else {
        citizenship.style.display = 'none';
    }
    if (ety.gender) {
        gender.innerText = '⚧️ ' + ety.gender;
    } else {
        gender.style.display = 'none';
    }
    if (ety.occupations) {
        occupations.innerText = '🛠️ ' + ety.occupations;
    } else {
        occupations.style.display = 'none';
    }
    if (ety.prizes) {
        prizes.innerText = '🏆 ' + ety.prizes;
    } else {
        prizes.style.display = 'none';
    }

    if (ety.pictures) {
        ety.pictures.forEach(function(img, n) {
            if (n < 5) {
                pictures.appendChild(imageToDomElement(img));
            }
        });
    } else {
        pictures.style.display = 'none';
    }

    if (ety.from_osm) {
        etyDomElement.querySelector('.etymology_src_osm').href = 'https://www.openstreetmap.org/' + ety.from_osm_type + '/' + ety.from_osm_id;
        etyDomElement.querySelector('.etymology_src_wd_wrapper').style.display = 'none';
    } else if (ety.from_wikidata) {
        etyDomElement.querySelector('.etymology_src_osm').href = 'https://www.openstreetmap.org/' + ety.from_osm_type + '/' + ety.from_osm_id;
        etyDomElement.querySelector('.etymology_src_wd_wrapper').style.display = 'inline';
        etyDomElement.querySelector('.etymology_src_wd').href = 'https://www.wikidata.org/wiki/' + ety.from_wikidata_cod + '#' + ety.from_wikidata_prop;
    } else {
        etyDomElement.querySelector('.etymology_src_wrapper').style.display = 'none';
    }

    return etyDomElement
}

function imageToDomElement(img) {
    const link = document.createElement('a'),
        picture = document.createElement('img'),
        attribution = document.createElement('p'),
        imgContainer = document.createElement('div');

    picture.className = 'pic-img';
    picture.alt = "Etymology picture via Wikimedia Commons";
    picture.src = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + img.picture + '?width=400px';
    // Link to thumbnail, example: "https://commons.wikimedia.org/wiki/Special:FilePath/Dal%20Monte%20Casoni.tif?width=400px"

    link.className = 'pic-link';
    link.title = "Etymology picture via Wikimedia Commons";
    link.href = 'https://commons.wikimedia.org/wiki/File:' + img.picture;
    // Link to original image page, example: "https://commons.wikimedia.org/wiki/File:Dal_Monte_Casoni.tif"
    link.appendChild(picture);
    imgContainer.appendChild(link);

    if (img.attribution) {
        attribution.className = 'pic-attr';
        attribution.innerHTML = 'Image via ' + img.attribution;
        imgContainer.appendChild(attribution);
    }

    imgContainer.className = 'pic-container';

    return imgContainer;
}

/*function popStateHandler(e) {
    console.info("popStateHandler", e);
    const closeButtons = document.getElementsByClassName("mapboxgl-popup-close-button");
    for (const button of closeButtons) {
        button.click();
    }
}*/

/**
 * 
 * @param {Event} e The event to handle 
 */
function initPage(e) {
    console.info("initPage", e);
    //document.addEventListener('deviceready', () => window.addEventListener('backbutton', backButtonHandler, false));
    //document.addEventListener('popstate', popStateHandler, false);
    //setCulture(); //! Map hasn't yet loaded, setLayoutProperty() won't work and labels won't be localized
    // https://docs.mapbox.com/mapbox-gl-js/example/check-for-support/
    if (typeof mapboxgl == "undefined" || !mapboxgl) {
        alert('There was an error while loading Mapbox GL JS (the library needed to create the map)');
        logErrorMessage("Undefined mapboxgl");
    } else if (!mapboxgl.supported()) {
        alert('Your browser does not support Mapbox GL');
        logErrorMessage("Device/Browser does not support Mapbox GL");
    } else {
        if (enable_map_static_preview)
            initMapPreview();
        initMap();
        //setCulture(); //! Map style likely still loading, setLayoutProperty() will cause an error
    }
}

/**
 * 
 * @param {string|Date} date 
 * @param {int} precision https://www.wikidata.org/wiki/Help:Dates#Precision
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat
 * @return {string}
 */
function formatDate(date, precision) {
    let dateObject, options = {};

    if (date instanceof Date)
        dateObject = date;
    else if (typeof date === 'string')
        dateObject = new Date(date);
    else if (typeof date === 'number')
        dateObject = new Date(date * 1000); // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#the_ecmascript_epoch_and_timestamps
    else
        throw new Error("Invalid date parameter");

    if (precision) {
        if (precision >= 14) options.second = 'numeric';
        if (precision >= 13) options.minute = 'numeric';
        if (precision >= 12) options.hour = 'numeric';
        if (precision >= 11) options.day = 'numeric';
        if (precision >= 10) options.month = 'numeric';
        options.year = 'numeric';
    }

    if (dateObject < new Date('0000-01-01T00:00:00')) {
        options.era = "short";
    }

    const out = dateObject.toLocaleDateString(document.documentElement.lang, options);
    //console.info("formatDate", { date, precision, dateObject, options, out });
    return out;
}