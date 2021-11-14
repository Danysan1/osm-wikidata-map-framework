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
            text: 'By gender',
            color: [
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
            legend: [
                ['#e55e5e', 'Female'],
                ['#BB737B', 'Transgender female'],
                ['#908897', 'Intersex'],
                ['#669DB4', 'Transgender male'],
                ['#3bb2d0', 'Male'],
                ['#223b53', 'Other']
            ],
            urlCode: "genderStats",
        },
        type: {
            text: 'By type',
            color: [
                'match', ['get', 'instanceID', ['at', 0, ['get', 'etymologies']]],
                // People
                'http://www.wikidata.org/entity/Q5', '#3bb2d0', // human
                'http://www.wikidata.org/entity/Q21070568', '#3bb2d0', // human who may be fictional
                'http://www.wikidata.org/entity/Q14073567', '#3bb2d0', // sibling duo
                'http://www.wikidata.org/entity/Q16979650', '#3bb2d0', // sibling group
                'http://www.wikidata.org/entity/Q20643955', '#3bb2d0', // human biblical figure
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
                'http://www.wikidata.org/entity/Q3918', '#fbb03b', // university
                // Historic events
                'http://www.wikidata.org/entity/Q178561', '#e55e5e', // battle
                'http://www.wikidata.org/entity/Q188055', '#e55e5e', // siege
                'http://www.wikidata.org/entity/Q3199915', '#e55e5e', // massacre
                'http://www.wikidata.org/entity/Q107706', '#e55e5e', // armistice
                'http://www.wikidata.org/entity/Q750215', '#e55e5e', // mass murder
                'http://www.wikidata.org/entity/Q891854', '#e55e5e', // bomb attack
                'http://www.wikidata.org/entity/Q898712', '#e55e5e', // aircraft hijacking
                'http://www.wikidata.org/entity/Q217327', '#e55e5e', // suicide attack
                'http://www.wikidata.org/entity/Q2223653', '#e55e5e', // terrorist attack
                'http://www.wikidata.org/entity/Q175331', '#e55e5e', // Demonstration
                // Human settlements
                'http://www.wikidata.org/entity/Q515', '#fed976', // city
                'http://www.wikidata.org/entity/Q1549591', '#fed976', // big city
                'http://www.wikidata.org/entity/Q702492', '#fed976', // urban area
                'http://www.wikidata.org/entity/Q956214', '#fed976', // chef-lieu
                'http://www.wikidata.org/entity/Q1637706', '#fed976', // million city
                'http://www.wikidata.org/entity/Q747074', '#fed976', // comune of Italy
                'http://www.wikidata.org/entity/Q484170', '#fed976', // commune of France
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
                'http://www.wikidata.org/entity/Q5084', '#fed976', // hamlet
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
                'http://www.wikidata.org/entity/Q355304', '#348C31', // watercourse
                'http://www.wikidata.org/entity/Q4022', '#348C31', // river
                'http://www.wikidata.org/entity/Q570116', '#348C31', // tourist attraction
                'http://www.wikidata.org/entity/Q34918903', '#348C31', // National Park of the United States
                'http://www.wikidata.org/entity/Q22698', '#348C31', // park
                'http://www.wikidata.org/entity/Q7245083', '#348C31', // principal meridian
                'http://www.wikidata.org/entity/Q32099', '#348C31', // meridian
                'http://www.wikidata.org/entity/Q146591', '#348C31', // circle of latitude
                // Other
                '#223b53'
            ],
            legend: [
                ['#3bb2d0', "Human"],
                ['#fbb03b', 'Buildings'],
                ['#e55e5e', 'Historic events'],
                ['#fed976', 'Cities'],
                ['#348C31', 'Locations'],
                ['#223b53', 'Other']
            ],
            urlCode: "typeStats",
        },
        black: { text: 'Uniform black', color: '#223b53', legend: null },
        red: { text: 'Uniform red', color: '#e55e5e', legend: null },
        orange: { text: 'Uniform orange', color: '#fbb03b', legend: null },
    };
console.info("start", {
    thresholdZoomLevel,
    minZoomLevel,
    defaultBackgroundStyle,
    defaultColorScheme,
    default_center_lon,
    default_center_lat,
    default_zoom
});
let map, colorControl;

document.addEventListener("DOMContentLoaded", initPage);

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
        console.info("BackgroundStyleControl dropDown click", backgroundStyleObj, event);
        if (backgroundStyleObj) {
            this._map.setStyle(backgroundStyleObj.style);
            this._ctrlDropDown.className = 'hiddenElement';
        } else {
            console.error("Invalid selected background style", event.target.value);
            if (typeof Sentry != 'undefined') Sentry.captureMessage("Invalid selected background style");
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
        let color, legend;

        if (colorScheme) {
            color = colorScheme.color;
            legend = colorScheme.legend;
        } else {
            console.error("Invalid selected color scheme", event.target.value);
            if (typeof Sentry != 'undefined') Sentry.captureMessage("Invalid selected color scheme");
            color = '#3bb2d0';
            legend = null;
        }

        [
            ["wikidata_layer_point", "circle-color"],
            ["wikidata_layer_lineString", 'line-color'],
            ["wikidata_layer_polygon", 'fill-color'],
        ].forEach(([layerID, property]) => {
            if (this._map.getLayer(layerID)) {
                this._map.setPaintProperty(layerID, property, color);
            } else {
                console.warn("Layer does not exist, can't set property", { layerID, property, color });
            }
        });

        if (!legend) {
            this._ctrlDropDown.className = 'hiddenElement';
        }

        this.updateChart(event);

        //updateDataSource(event);
    }

    updateChart(event) {
        const colorScheme = colorSchemes[this._ctrlDropDown.value];
        console.info("updateChart", { event, colorScheme, chart: this._chart });

        let data = {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
            }]
        };

        if (colorScheme && colorScheme.urlCode) {
            //if (this._chartXHR)
            //    this._chartXHR.abort();
            const bounds = map.getBounds(),
                southWest = bounds.getSouthWest(),
                minLat = Math.round(southWest.lat * 1000) / 1000,
                minLon = Math.round(southWest.lng * 1000) / 1000,
                northEast = bounds.getNorthEast(),
                maxLat = Math.round(northEast.lat * 1000) / 1000,
                maxLon = Math.round(northEast.lng * 1000) / 1000,
                language = document.documentElement.lang,
                queryParams = {
                    from: "bbox",
                    to: colorScheme.urlCode,
                    minLat,
                    minLon,
                    maxLat,
                    maxLon,
                    language,
                },
                queryString = new URLSearchParams(queryParams).toString(),
                stats_url = './etymologyMap.php?' + queryString,
                xhr = new XMLHttpRequest();
            xhr.onreadystatechange = (e) => {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    JSON.parse(xhr.responseText).forEach(row => {
                        //data.datasets[0].backgroundColor.push(row[""]);
                        data.labels.push(row["name"]);
                        data.datasets[0].data.push(row["count"]);
                    });
                    this.setChartData(data);
                } else {
                    console.error("XHR error", { e });
                    if (colorScheme.legend)
                        this.createChartFromLegend(colorScheme.legend);
                }
            }
            xhr.open('GET', stats_url, true);
            xhr.send();
            this._chartXHR = xhr;
        } else if (colorScheme && colorScheme.legend) {
            this.createChartFromLegend(colorScheme.legend);
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
        console.info("setChartData", { container: this._container, chart: this._chart, data });
        if (this._chart) {
            try {
                this._container.removeChild(this._chart);
            } catch (error) {
                console.warn("Error removing old chart", { error, container: this._container, chart: this._chart });
            }
        }

        //this._legend.className = 'legend';
        this._chart = document.createElement('canvas');
        this._chart.className = 'chart';
        this._container.appendChild(this._chart);
        const ctx = this._chart.getContext('2d'),
            chartObject = new Chart(ctx, {
                type: "pie",
                data: data,
            });
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

function getPositionFromHash() {
    let params = window.location.hash ? window.location.hash.substr(1).split(",") : null,
        lon = (params && params[0]) ? parseFloat(params[0]) : NaN,
        lat = (params && params[1]) ? parseFloat(params[1]) : NaN,
        zoom = (params && params[2]) ? parseFloat(params[2]) : NaN;
    if (lat < -90 || lat > 90) {
        console.error("Invalid latitude", lat);
        lat = NaN;
    }

    if (isNaN(lon) || isNaN(lat) || isNaN(zoom)) {
        console.info("Using default position", { lon, lat, zoom, default_center_lon, default_center_lat, default_zoom });
        lon = default_center_lon;
        lat = default_center_lat;
        zoom = default_zoom;
    }

    return { lat, lon, zoom };
}

function initMap() {
    if (map) {
        console.info("The map is already initialized");
    } else {
        mapboxgl.accessToken = mapbox_gl_token;
        const startPosition = getPositionFromHash(),
            backgroundStyleObj = backgroundStyles[defaultBackgroundStyle];
        console.info("Initializing the map", { startPosition, backgroundStyleObj });
        let backgroundStyle;
        if (backgroundStyleObj) {
            backgroundStyle = backgroundStyleObj.style;
        } else {
            console.error("Invalid default background style", defaultBackgroundStyle);
            if (typeof Sentry != 'undefined') Sentry.captureMessage("Invalid default background style");
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
            center: [startPosition.lon, startPosition.lat], // starting position [lon, lat]
            zoom: startPosition.zoom, // starting zoom
        });

        map.on('load', mapLoadedHandler);
        map.on('styledata', mapStyleDataHandler);

        window.addEventListener('hashchange', hashChangeHandler, false);

        map.addControl(new MapboxLanguage({
            //defaultLanguage: document.documentElement.lang
        }));
    }
}

/**
 * 
 * @param {MapDataEvent} e The event to handle 
 */
function mapStyleDataHandler(e) {
    console.info("Map style data loaded", e);
    setCulture();
}

/**
 * 
 * @param {HashChangeEvent} e The event to handle 
 */
function hashChangeHandler(e) {
    const position = getPositionFromHash(),
        currLat = map.getCenter().lat,
        currLon = map.getCenter().lng,
        currZoom = map.getZoom();
    //console.info("hashChangeHandler", { position, currLat, currLon, currZoom, e });

    // Check if the position has changed in order to avoid unnecessary map movements
    if (Math.abs(currLat - position.lat) > 0.001 ||
        Math.abs(currLon - position.lon) > 0.001 ||
        Math.abs(currZoom - position.zoom) > 0.1) {
        map.flyTo({
            center: [position.lon, position.lat],
            zoom: position.zoom,
        });
    }
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
        overpassSourceEvent = e.dataType == "source" && e.sourceId == "overpass_source",
        ready = e.isSourceLoaded;
    //console.info('sourcedata event', { type: e.dataType, wikidataSourceEvent, overpassSourceEvent, ready, e });

    if (ready) {
        console.info('sourcedata ready event', { type: e.dataType, wikidataSourceEvent, overpassSourceEvent, e });
        if (wikidataSourceEvent || overpassSourceEvent) {
            //kendo.ui.progress($("#map"), false);
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
    if (["overpass_source", "wikidata_source"].includes(err.sourceId) && err.error.status > 200) {
        showSnackbar("An error occurred while fetching the data");
        errorMessage = "An error occurred while fetching " + err.sourceId;
    } else {
        showSnackbar("A map error occurred");
        errorMessage = "Map error: " + err.sourceId + " - " + err.error.message
    }
    if (typeof Sentry != 'undefined') Sentry.captureMessage(errorMessage, { level: "error", extra: err });
    console.error(errorMessage, err);
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
            to: "geojson",
            minLat,
            minLon,
            maxLat,
            maxLon,
            language,
        };
    //console.info("updateDataSource", { e, queryParams, zoomLevel, thresholdZoomLevel });
    //console.trace("updateDataSource");

    //kendo.ui.progress($("#map"), true);
    if (zoomLevel >= thresholdZoomLevel) {
        const wikidata_source = map.getSource("wikidata_source"),
            queryString = new URLSearchParams(queryParams).toString(),
            wikidata_url = './etymologyMap.php?' + queryString;
        console.info("Wikidata dataSource update", { queryParams, wikidata_url, wikidata_source });
        showSnackbar("Fetching data...", "lightblue", 10000);
        if (wikidata_source) {
            wikidata_source.setData(wikidata_url);
        } else {
            prepareWikidataLayers(wikidata_url);
        }
    } else if (zoomLevel < minZoomLevel) {
        //showSnackbar("Please zoom more to see data", "orange");
    } else {
        //queryParams.onlySkeleton = false;
        queryParams.onlyCenter = true;
        const overpass_source = map.getSource("overpass_source"),
            queryString = new URLSearchParams(queryParams).toString(),
            overpass_url = './overpass.php?' + queryString;
        console.info("Overpass dataSource update", { queryParams, overpass_url, overpass_source });
        showSnackbar("Fetching data...", "lightblue");
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
 * @param {string} wikidata_url
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
        'id': 'wikidata_layer_polygon',
        'source': 'wikidata_source',
        'type': 'fill',
        "filter": ["==", ["geometry-type"], "Polygon"],
        "minzoom": thresholdZoomLevel,
        'paint': {
            'fill-color': colorSchemes[defaultColorScheme].color,
            'fill-opacity': 0.5
        }
    });

    map.addLayer({
        'id': 'wikidata_layer_lineString',
        'source': 'wikidata_source',
        'type': 'line',
        "filter": ["==", ["geometry-type"], "LineString"],
        "minzoom": thresholdZoomLevel,
        'paint': {
            'line-color': colorSchemes[defaultColorScheme].color,
            'line-opacity': 0.5,
            'line-width': 10
        }
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
            'circle-color': colorSchemes[defaultColorScheme].color,
            'circle-stroke-color': 'white'
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
                .setLngLat(map.getBounds().getNorthWest())
                //.setMaxWidth('95vw')
                //.setOffset([10, 0])
                //.setHTML(featureToHTML(e.features[0]));
                .setHTML('<div class="detail_wrapper"></div>')
                .addTo(map);
            //console.info(popup, popup.getElement());
            popup.getElement().querySelector(".detail_wrapper").appendChild(featureToElement(e.features[0]));
            //console.info("showEtymologyPopup", { e, popup });
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

    if (document.getElementsByClassName("etymology-color-ctrl").length == 0) {
        colorControl = new EtymologyColorControl();
        setTimeout(() => map.addControl(colorControl, 'top-left'), 100);
        //map.addControl(colorControl, 'top-left');
    }
}

/**
 * Initializes the mid-zoom-level clustered layer.
 * 
 * @param {string} overpass_url
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
        //clusterMaxZoom: thresholdZoomLevel, // Max zoom to cluster points on
        //clusterMaxZoom: minZoomLevel, // Min zoom to cluster points on
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
            }),
            clusterId = features[0].properties.cluster_id,
            center = features[0].geometry.coordinates;
        console.info('Click overpass_layer_cluster', features, clusterId, center);
        map.getSource('overpass_source').getClusterExpansionZoom(
            clusterId,
            (err, zoom) => {
                if (err) return;

                map.easeTo({
                    center: center,
                    zoom: zoom
                });
            }
        );
    });

    map.on('click', 'overpass_layer_point', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
                layers: ['overpass_layer_point']
            }),
            center = features[0].geometry.coordinates;
        console.info('Click overpass_layer_point', features, center);
        map.easeTo({
            center: center,
            zoom: thresholdZoomLevel + 0.1
        });
    });

    map.on('mouseenter', 'overpass_layer_cluster', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'overpass_layer_cluster', () => map.getCanvas().style.cursor = '');
    map.on('mouseenter', 'overpass_layer_point', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'overpass_layer_point', () => map.getCanvas().style.cursor = '');
}

/**
 * 
 * @param {DragEvent} e The event to handle 
 */
function mapMoveEndHandler(e) {
    updateDataSource(e);
    const lat = Math.round(map.getCenter().lat * 10000) / 10000,
        lon = Math.round(map.getCenter().lng * 10000) / 10000,
        zoom = Math.round(map.getZoom() * 10) / 10;
    window.location.hash = "#" + lon + "," + lat + "," + zoom;
}

function mapLoadedHandler(e) {
    console.info("mapLoadedHandler", e);
    //setCulture();

    new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: true,
            closeOnMove: true,
        }).setLngLat(map.getBounds().getNorthWest())
        //.setMaxWidth('95vw')
        //.setOffset([10, 0])
        .setDOMContent(document.getElementById("intro"))
        .addTo(map);

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
    }), 'top-left');

    // https://docs.mapbox.com/mapbox-gl-js/api/markers/#navigationcontrol
    map.addControl(new mapboxgl.NavigationControl({
        visualizePitch: true
    }), 'top-right');

    // https://docs.mapbox.com/mapbox-gl-js/api/markers/#attributioncontrol
    /*map.addControl(new mapboxgl.AttributionControl({
        customAttribution: 'Etymology: <a href="https://www.wikidata.org/wiki/Wikidata:Introduction" target="_blank">Wikidata</a>'
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
    //map.addControl(new EtymologyColorControl(), 'bottom-right');

    map.on('sourcedata', mapSourceDataHandler);

    map.on('error', mapErrorHandler);

    prepareGlobalLayers();
}

/**
 * Initializes the low-zoom-level clustered layer.
 * 
 * @see prepareOverpassLayers
 */
function prepareGlobalLayers() {
    map.addSource('global_source', {
        type: 'geojson',
        data: './global-map.geojson',
        cluster: true,
        //clusterMaxZoom: minZoomLevel, // Max zoom to cluster points on
        clusterRadius: 100, // Radius of each cluster when clustering points (defaults to 50)
        clusterProperties: { "ety_count": ["+", ["get", "ety_count"]] },
        clusterMinPoints: 1,
    });

    map.addLayer({
        id: 'global_layer_cluster',
        source: 'global_source',
        type: 'circle',
        maxzoom: minZoomLevel,
        filter: ['has', 'ety_count'],
        paint: {
            // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
            // with three steps to implement three types of circles:
            // - Blue, 20px circles when point count is less than 100
            // - Yellow, 30px circles when point count is between 100 and 750
            // - Pink, 40px circles when point count is greater than or equal to 750
            'circle-color': [
                'step', ['get', 'ety_count'], '#51bbd6', 2000, '#f1f075', 40000, '#f28cb1'
            ],
            'circle-radius': [
                'step', ['get', 'ety_count'], 20, 2000, 50, 40000, 60
            ]
        }
    });

    map.addLayer({
        id: 'global_layer_count',
        type: 'symbol',
        source: 'global_source',
        maxzoom: minZoomLevel,
        filter: ['has', 'ety_count'],
        layout: {
            'text-field': '{ety_count}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12
        }
    });

    // inspect a cluster on click
    map.on('click', 'global_layer_cluster', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
                layers: ['global_layer_cluster']
            }),
            clusterId = features[0].properties.cluster_id,
            center = features[0].geometry.coordinates;
        if (clusterId == null) {
            console.warn("clusterId is null");
        } else {
            console.info('Click global_layer_cluster', features, clusterId, center);
        }
        map.getSource('global_source').getClusterExpansionZoom(
            clusterId,
            (err, zoom) => {
                if (err) {
                    console.error("Not easing because of an error: ", err);
                } else {
                    if (!zoom) {
                        zoom = minZoomLevel + 0.1
                        console.warn("Empty zoom, using default", zoom, center, clusterId);
                    } else {
                        console.info("Easing to cluster coordinates", center, zoom, clusterId);
                    }
                    map.easeTo({
                        center: center,
                        zoom: zoom
                    });
                }
            }
        );
    });

    map.on('mouseenter', 'global_layer_cluster', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'global_layer_cluster', () => map.getCanvas().style.cursor = '');
}

function setCulture() {
    const culture = document.documentElement.lang,
        lang = culture.substr(0, 2),
        nameProperty = ['coalesce', ['get', `name_` + lang],
            ['get', `name`]
        ];
    console.info("setCulture", { culture, lang, nameProperty, map });

    if (map) {
        // https://docs.mapbox.com/mapbox-gl-js/example/language-switch/
        // https://docs.mapbox.com/mapbox-gl-js/api/map/#map#setlayoutproperty
        map.setLayoutProperty('country-label', 'text-field', nameProperty);
        map.setLayoutProperty('road-label', 'text-field', nameProperty);
        map.setLayoutProperty('settlement-label', 'text-field', nameProperty);
        map.setLayoutProperty('poi-label', 'text-field', nameProperty);
    }

    console.info("culture", culture);
    //kendo.culture(culture);
}

/**
 * 
 * @param {any} feature 
 * @return {Node}
 */
function featureToElement(feature) {
    const etymologies = JSON.parse(feature.properties.etymologies),
        detail_template = document.getElementById('detail_template'),
        etymology_template = document.getElementById('etymology_template'),
        detail_container = detail_template.content.cloneNode(true),
        //template_container = document.createDocumentFragment(),
        element_wikipedia_button = detail_container.querySelector('.element_wikipedia_button'),
        etymologies_container = detail_container.querySelector('.etymologies_container');;
    //template_container.appendChild(detail_container);
    console.info("featureToElement", { feature, etymologies, detail_container, etymologies_container });

    if (feature.properties.name) {
        detail_container.querySelector('.element_name').innerText = '📍 ' + feature.properties.name;
    }

    if (feature.properties.wikipedia) {
        element_wikipedia_button.href = 'https://www.wikipedia.org/wiki/' + feature.properties.wikipedia;
        element_wikipedia_button.style.display = 'inline-flex';
    } else {
        element_wikipedia_button.style.display = 'none';
    }

    detail_container.querySelector('.osm_button').href = 'https://www.openstreetmap.org/' + feature.properties['@id'];

    coord = feature.geometry.coordinates;
    while (Array.isArray(coord) && Array.isArray(coord[0])) {
        coord = coord[0];
    }
    detail_container.querySelector('.element_location_button').href = "#" + coord[0] + "," + coord[1] + ",18";


    etymologies.filter(x => x != null).forEach(function(ety) {
        const etymology = etymology_template.content.cloneNode(true),
            etymology_description = etymology.querySelector('.etymology_description'),
            wikipedia_button = etymology.querySelector('.wikipedia_button'),
            commons_button = etymology.querySelector('.commons_button'),
            location_button = etymology.querySelector('.subject_location_button'),
            start_end_date = etymology.querySelector('.start_end_date'),
            event_place = etymology.querySelector('.event_place'),
            citizenship = etymology.querySelector('.citizenship'),
            gender = etymology.querySelector('.gender'),
            occupations = etymology.querySelector('.occupations'),
            prizes = etymology.querySelector('.prizes'),
            pictures = etymology.querySelector('.pictures');

        etymology.querySelector('.etymology_name').innerText = ety.name;

        if (ety.description) {
            etymology_description.innerText = ety.description;
        } else {
            etymology_description.style.display = 'none';
        }

        try {
            etymology.querySelector('.wikidata_button').href = ety.wikidata;

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

            if (ety.wkt_coords) {
                const coords = /Point\(([-\d\.]+) ([-\d\.]+)\)/i.exec(ety.wkt_coords);
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
                        const link = document.createElement('a'),
                            picture = document.createElement('img');
                        link.href = img;
                        link.target = '_blank';
                        picture.src = img;
                        picture.alt = "Etymology picture";
                        link.appendChild(picture);
                        pictures.appendChild(link);
                    }
                });
            } else {
                pictures.style.display = 'none';
            }
        } catch (e) {
            console.error(e);
            if (typeof Sentry != 'undefined')
                Sentry.captureException(e);
        }

        etymologies_container.appendChild(etymology);
    });
    return detail_container;
}

/**
 * @param {any} feature
 * @return {string}
 */
function featureToHTML(feature) {
    return featureToElement(feature).innerHTML;
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
    setCulture();
    // https://docs.mapbox.com/mapbox-gl-js/example/check-for-support/
    if (!mapboxgl) {
        alert('There was an error while loading Mapbox GL');
        if (typeof Sentry != 'undefined')
            Sentry.captureMessage("Undefined mapboxgl", { level: "error" });
    } else if (!mapboxgl.supported()) {
        alert('Your browser does not support Mapbox GL');
        if (typeof Sentry != 'undefined')
            Sentry.captureMessage("Device/Browser does not support Mapbox GL", { level: "error" });
    } else {
        initMap();
    }
}

/**
 * 
 * @param {string|Date} date 
 * @param {int} precision https://www.wikidata.org/wiki/Help:Dates#Precision
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat
 * @return {string}
 */
function formatDate(date, precision) {
    let dateObject, options = {};

    if (date instanceof Date)
        dateObject = date;
    else if (typeof date === 'string')
        dateObject = new Date(date);
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

    const out = dateObject.toLocaleDateString(document.documentElement.lang, options);
    //console.info("formatDate", { date, precision, dateObject, options, out });
    return out;
}