/* global mapboxgl mapbox_gl_token MapboxLanguage MapboxGeocoder Sentry Chart thresholdZoomLevel minZoomLevel defaultBackgroundStyle defaultColorScheme default_center_lon default_center_lat default_zoom */
const backgroundStyles = {
        streets: { text: 'Streets', style: 'mapbox://styles/mapbox/streets-v11' },
        light: { text: 'Light', style: 'mapbox://styles/mapbox/light-v10' },
        dark: { text: 'Dark', style: 'mapbox://styles/mapbox/dark-v10' },
        //satellite: { text: 'Satellite', style: 'mapbox://styles/mapbox/satellite-v9' }, // Not compatible with MapboxLanguage 
        hybrid: { text: 'Satellite', style: 'mapbox://styles/mapbox/satellite-streets-v11' },
        outdoors: { text: 'Outdoors', style: 'mapbox://styles/mapbox/outdoors-v11' },
    },
    genderColorMap = [
        // https://www.wikidata.org/wiki/Property:P21
        // https://meyerweb.com/eric/tools/color-blend/#3BB2D0:E55E5E:3:hex
        ["Female", "Female", "#e55e5e", "Q6581072"],
        ["Transgender female", "Transgender female", "#BB737B", "Q1052281"],
        ["Intersex", "Intersex", "#908897", "Q1097630"],
        ["Transgender male", "Transgender male", "#669DB4", "Q2449503"],
        ["Male", "Male", "#3bb2d0", "Q6581097"],
        ["Other", "Other", "#223b53", null],
    ],
    typeColorMap = [
        ["People", "human", "#3bb2d0", "Q5"],
        ["People", "human who may be fictional", "#3bb2d0", "Q21070568"],
        ["People", "sibling duo", "#3bb2d0", "Q14073567"],
        ["People", "sibling group", "#3bb2d0", "Q16979650"],
        ["People", "human biblical figure", "#3bb2d0", "Q20643955"],
        ["Buildings", "castle", "#fbb03b", "Q23413"],
        ["Buildings", "château", "#fbb03b", "Q751876"],
        ["Buildings", "real property", "#fbb03b", "Q684740"],
        ["Buildings", "architectural structure", "#fbb03b", "Q811979"],
        ["Buildings", "cultural heritage ensemble", "#fbb03b", "Q1516079"],
        ["Buildings", "museum", "#fbb03b", "Q33506"],
        ["Buildings", "church", "#fbb03b", "Q16970"],
        ["Buildings", "seminary", "#fbb03b", "Q233324"],
        ["Buildings", "abbey", "#fbb03b", "Q160742"],
        ["Buildings", "benedictine abbey", "#fbb03b", "Q817056"],
        ["Buildings", "basilica", "#fbb03b", "Q163687"],
        ["Buildings", "minor basilica", "#fbb03b", "Q120560"],
        ["Buildings", "monastery", "#fbb03b", "Q44613"],
        ["Buildings", "mission complex", "#fbb03b", "Q1564373"],
        ["Buildings", "statue", "#fbb03b", "Q179700"],
        ["Buildings", "colossal statue", "#fbb03b", "Q1779653"],
        ["Buildings", "university", "#fbb03b", "Q3918"],
        ["Buildings", "fort", "#fbb03b", "Q1785071"],
        ["Buildings", "route nationale", "#fbb03b", "Q1426271"],
        ["Buildings", "route départementale", "#fbb03b", "Q19796778"],
        ["Historic events", "battle", "#e55e5e", "Q178561"],
        ["Historic events", "siege", "#e55e5e", "Q188055"],
        ["Historic events", "massacre", "#e55e5e", "Q3199915"],
        ["Historic events", "armistice", "#e55e5e", "Q107706"],
        ["Historic events", "mass murder", "#e55e5e", "Q750215"],
        ["Historic events", "bomb attack", "#e55e5e", "Q891854"],
        ["Historic events", "aircraft hijacking", "#e55e5e", "Q898712"],
        ["Historic events", "suicide attack", "#e55e5e", "Q217327"],
        ["Historic events", "war crime", "#e55e5e", "Q135010"],
        ["Historic events", "invasion", "#e55e5e", "Q467011"],
        ["Historic events", "resistance movement", "#e55e5e", "Q138796"],
        ["Historic events", "terrorist attack", "#e55e5e", "Q2223653"],
        ["Historic events", "Demonstration", "#e55e5e", "Q175331"],
        ["Historic events", "calendar day of a given year", "#e55e5e", "Q47150325"],
        ["Historic events", "student protest", "#e55e5e", "Q1679887"],
        ["Human settlements", "city", "#fed976", "Q515"],
        ["Human settlements", "big city", "#fed976", "Q1549591"],
        ["Human settlements", "global city", "#fed976", "Q208511"],
        ["Human settlements", "urban area", "#fed976", "Q702492"],
        ["Human settlements", "chef-lieu", "#fed976", "Q956214"],
        ["Human settlements", "million city", "#fed976", "Q1637706"],
        ["Human settlements", "comune of Italy", "#fed976", "Q747074"],
        ["Human settlements", "commune of France", "#fed976", "Q484170"],
        ["Human settlements", "urban municipality of Germany", "#fed976", "Q42744322"],
        ["Human settlements", "town in Croatia", "#fed976", "Q15105893"],
        ["Human settlements", "port settlement", "#fed976", "Q2264924"],
        ["Human settlements", "ancient city", "#fed976", "Q15661340"],
        ["Human settlements", "border town", "#fed976", "Q902814"],
        ["Human settlements", "capital", "#fed976", "Q5119"],
        ["Human settlements", "roman city", "#fed976", "Q2202509"],
        ["Human settlements", "town", "#fed976", "Q3957"],
        ["Human settlements", "human settlement", "#fed976", "Q486972"],
        ["Human settlements", "spa-town", "#fed976", "Q4946461"],
        ["Human settlements", "religious site", "#fed976", "Q15135589"],
        ["Human settlements", "municipality seat", "#fed976", "Q15303838"],
        ["Human settlements", "neighborhood", "#fed976", "Q123705"],
        ["Human settlements", "residence park", "#fed976", "Q7315416"],
        ["Human settlements", "hamlet", "#fed976", "Q5084"],
        ["Human settlements", "lieu-dit", "#fed976", "Q181307"],
        ["Human settlements", "municipality of Aragon", "#fed976", "Q61763947"],
        ["Locations", "area", "#51318C", "Q1414991"],
        ["Locations", "historical region", "#51318C", "Q1620908"],
        ["Locations", "U.S. state", "#51318C", "Q35657"],
        ["Locations", "nation within the UK", "#51318C", "Q3336843"],
        ["Locations", "region of France", "#51318C", "Q36784"],
        ["Locations", "country", "#51318C", "Q6256"],
        ["Locations", "continent", "#51318C", "Q5107"],
        ["Locations", "land", "#51318C", "Q11081619"],
        ["Locations", "island", "#51318C", "Q23442"],
        ["Locations", "hill", "#51318C", "Q54050"],
        ["Locations", "tourist attraction", "#51318C", "Q570116"],
        ["Locations", "principal meridian", "#51318C", "Q7245083"],
        ["Locations", "meridian", "#51318C", "Q32099"],
        ["Locations", "circle of latitude", "#51318C", "Q146591"],
        ["Locations", "geographic region", "#51318C", "Q82794"],
        ["Nature", "mountain", "#348C31", "Q8502"],
        ["Nature", "mountain range", "#348C31", "Q46831"],
        ["Nature", "alpine group", "#348C31", "Q3777462"],
        ["Nature", "volcano", "#348C31", "Q8072"],
        ["Nature", "stratovolcano", "#348C31", "Q169358"],
        ["Nature", "forest", "#348C31", "Q4421"],
        ["Nature", "watercourse", "#348C31", "Q355304"],
        ["Nature", "river", "#348C31", "Q4022"],
        ["Nature", "National Park of the United States", "#348C31", "Q34918903"],
        ["Nature", "park", "#348C31", "Q22698"],
        ["Nature", "main stream", "#348C31", "Q573344"],
        ["Nature", "stream", "#348C31", "Q47521"],
        ["Nature", "canal", "#348C31", "Q12284"],
        ["Nature", "sea", "#348C31", "Q165"],
        ["Nature", "strait", "#348C31", "Q37901"],
        ["Other", "Other", "#223b53", null],
    ],
    colorSchemes = {
        blue: { text: 'Uniform blue', color: '#3bb2d0', legend: null },
        gender: {
            colorMap: genderColorMap,
            text: 'By gender',
            color: genderColorMap.reduce(
                function(array, x) {
                    if (x[3])
                        array.push(x[3]);
                    array.push(x[2]);
                    return array;
                }, ['match', ['get', 'genderID', ['at', 0, ['get', 'etymologies']]]]
            ),
            urlCode: "genderStats",
        },
        type: {
            colorMap: typeColorMap,
            text: 'By type',
            color: typeColorMap.reduce(
                function(array, x) {
                    if (x[3])
                        array.push(x[3]);
                    array.push(x[2]);
                    return array;
                }, ['match', ['get', 'instanceID', ['at', 0, ['get', 'etymologies']]]]
            ),
            urlCode: "typeStats",
        },
        black: { text: 'Uniform black', color: '#223b53', legend: null },
        red: { text: 'Uniform red', color: '#e55e5e', legend: null },
        orange: { text: 'Uniform orange', color: '#fbb03b', legend: null },
    };

/**
 * Gets the parameters passed through the fragment
 * 
 * @returns {object} Parameters passed through the fragment
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
    let p = getFragmentParams();

    if (lon !== undefined) p.lon = lon;
    if (lat !== undefined) p.lat = lat;
    if (zoom !== undefined) p.zoom = zoom;
    if (colorScheme !== undefined) p.colorScheme = colorScheme;

    const fragment = "#" + p.lon + "," + p.lat + "," + p.zoom + "," + p.colorScheme;
    window.location.hash = fragment;
    //console.info("setFragmentParams", p, fragment);
    return fragment;
}

let startColorScheme = getFragmentParams().colorScheme;
if (startColorScheme) {
    const validColorSchemes = Object.keys(colorSchemes);
    if (!validColorSchemes.includes(startColorScheme)) {
        startColorScheme = defaultColorScheme;
        console.warn("Not using invalid color scheme from parameters", { startColorScheme, validColorSchemes, defaultColorScheme });
    }
} else {
    startColorScheme = defaultColorScheme;
}
console.info("start", {
    thresholdZoomLevel,
    minZoomLevel,
    defaultBackgroundStyle,
    defaultColorScheme,
    startColorScheme,
    default_center_lon,
    default_center_lat,
    default_zoom
});

/**
 * @param {object} colorscheme
 * @return {array}
 * @see https://stackoverflow.com/a/14438954/2347196
 * @see https://codeburst.io/javascript-array-distinct-5edc93501dc4
 */
function colorSchemeToLegend(colorScheme) {
    if (!colorScheme.colorMap)
        throw new Error("colorSchemeToLegend: colorMap is not defined");
    const colorMap = colorScheme.colorMap,
        distinctLabels = [...(new Set(colorMap.map(color => color[0])))];
    return distinctLabels.map(label => [colorMap.find(row => row[0] == label)[2], label]);
}

let colorControl;

/**
 * Opens the information intro window
 * 
 * @param {Map} map 
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
            console.error("Invalid selected background style", event.target.value);
            if (typeof Sentry != 'undefined')
                Sentry.captureMessage("Invalid selected background style");
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
            if (value === startColorScheme) {
                option.selected = true;
            }
            this._ctrlDropDown.appendChild(option);
        }

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

    dropDownClickHandler(event) {
        const colorScheme = event.target.value,
            colorSchemeObj = colorSchemes[colorScheme];
        let color;

        if (colorSchemeObj) {
            color = colorSchemeObj.color;
        } else {
            console.error("Invalid selected color scheme", colorScheme);
            if (typeof Sentry != 'undefined')
                Sentry.captureMessage("Invalid selected color scheme", { level: 'error', extra: { colorScheme } });
            color = '#3bb2d0';
        }
        console.info("EtymologyColorControl dropDown click", { event, colorSchemeObj, color });

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

    updateChart(event) {
        const colorScheme = colorSchemes[this._ctrlDropDown.value];
        console.info("updateChart", { event, colorScheme });

        let data = {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
            }]
        };

        if (colorScheme && colorScheme.urlCode) {
            console.info("updateChart main: URL code", { colorScheme });
            if (this._chartXHR)
                this._chartXHR.abort();

            const map = event.target,
                bounds = map.getBounds(),
                southWest = bounds.getSouthWest(),
                minLat = southWest.lat, // Math.round(southWest.lat * 1000) / 1000,
                minLon = southWest.lng, // Math.round(southWest.lng * 1000) / 1000,
                northEast = bounds.getNorthEast(),
                maxLat = northEast.lat, // Math.round(northEast.lat * 1000) / 1000,
                maxLon = northEast.lng, // Math.round(northEast.lng * 1000) / 1000,
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
                stats_url = './stats.php?' + queryString,
                xhr = new XMLHttpRequest();
            xhr.onreadystatechange = (e) => {
                const readyState = xhr.readyState,
                    status = xhr.status;
                if (readyState == XMLHttpRequest.DONE) {
                    if (status == 200) {
                        JSON.parse(xhr.responseText).forEach(row => {
                            const colorMapItem = colorScheme.colorMap.find(x => x[3] == row.id),
                                color = colorMapItem ? colorMapItem[2] : '#223b53';
                            //console.info("updateChart row", { xhr, row, colorScheme, colorMapItem, color });
                            data.datasets[0].backgroundColor.push(color);
                            data.labels.push(row["name"]);
                            data.datasets[0].data.push(row["count"]);
                        });
                        this.setChartData(data);
                    } else if (readyState == XMLHttpRequest.UNSENT || status == 0) {
                        console.info("XHR aborted", { xhr, readyState, status, e });
                    } else {
                        console.error("XHR error", { xhr, readyState, status, e });
                        this.createChartFromLegend(colorSchemeToLegend(colorScheme));
                    }
                }
            }
            xhr.open('GET', stats_url, true);
            xhr.send();
            this._chartXHR = xhr;
        } else if (colorScheme && colorScheme.colorMap) {
            console.info("updateChart fallback: legend", { colorScheme });
            this.createChartFromLegend(colorSchemeToLegend(colorScheme));
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
            if (typeof Sentry != 'undefined')
                Sentry.captureMessage("Undefined Chart", { level: "error" });
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

function getPositionFromFragment() {
    let p = getFragmentParams();
    if (p.lat < -90 || p.lat > 90) {
        console.error("Invalid latitude", p.lat);
        p.lat = undefined;
    }

    if (p.lon === undefined || p.lat === undefined || p.zoom === undefined) {
        console.info("Using default position", { p, default_center_lon, default_center_lat, default_zoom });
        p.lon = default_center_lon;
        p.lat = default_center_lat;
        p.zoom = default_zoom;
    }

    return p;
}

/**
 * Initializes the static map preview
 * 
 * @see https://docs.mapbox.com/help/tutorials/improve-perceived-performance-with-static/
 * @see https://docs.mapbox.com/api/maps/static-images/
 */
function initMapPreview() {
    try {
        console.info("initMapPreview: Initializing the map preview");
        const startPosition = getPositionFromFragment(),
            lon = startPosition.lon,
            lat = startPosition.lat,
            zoom = startPosition.zoom,
            map_static_preview = document.getElementById('map_static_preview'),
            width = map_static_preview.clientWidth,
            height = map_static_preview.clientHeight,
            //imgURL = 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/-85.757,38.25,10/600x400?access_token=' + mapbox_gl_token;
            imgURL = 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/' + lon + ',' + lat + ',' + zoom + '/' + width + 'x' + height + '?access_token=' + mapbox_gl_token;
        console.info("Initializing the map preview", { startPosition, imgURL });

        map_static_preview.style.backgroundImage = 'url(' + imgURL + ')';
        map_static_preview.style.backgroundRepeat = 'no-repeat';
        map_static_preview.style.backgroundSize = 'cover';
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
    const startPosition = getPositionFromFragment(),
        backgroundStyleObj = backgroundStyles[defaultBackgroundStyle];
    console.info("Initializing the map", { startPosition, backgroundStyleObj });
    let map, backgroundStyle;
    if (backgroundStyleObj) {
        backgroundStyle = backgroundStyleObj.style;
    } else {
        console.error("Invalid default background style", defaultBackgroundStyle);
        if (typeof Sentry != 'undefined')
            Sentry.captureMessage("Invalid default background style");
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
    openIntroWindow(map);

    map.on('load', mapLoadedHandler);
    map.on('styledata', mapStyleDataHandler);

    setFragmentParams(startPosition.lon, startPosition.lat, startPosition.zoom, defaultColorScheme);
    window.addEventListener('hashchange', (e) => hashChangeHandler(e, map), false);

    try {
        map.addControl(new MapboxLanguage({
            defaultLanguage: document.documentElement.lang.substring(0, 2)
        }));
    } catch (err) {
        console.warn("Failed setting up mapbox-gl-language", err);
        if (typeof Sentry != 'undefined')
            Sentry.captureException(err);
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
 * @param {Map} map 
 */
function hashChangeHandler(e, map) {
    const position = getPositionFromFragment(),
        currLat = map.getCenter().lat,
        currLon = map.getCenter().lng,
        currZoom = map.getZoom();
    console.info("hashChangeHandler", { position, currLat, currLon, currZoom, e });

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
        overpassSourceEvent = e.dataType == "source" && e.sourceId == "elements_source",
        ready = e.isSourceLoaded;
    if (wikidataSourceEvent || overpassSourceEvent || ready) {
        console.info('sourcedata event', {
            type: e.dataType,
            source: e.sourceId,
            wikidataSourceEvent,
            overpassSourceEvent,
            ready,
            e
        });
    }

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
    if (typeof Sentry != 'undefined')
        Sentry.captureMessage(errorMessage, { level: "error", extra: err });
    console.error(errorMessage, err);
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
        minLat = southWest.lat, // Math.round(southWest.lat * 1000) / 1000,
        minLon = southWest.lng, // Math.round(southWest.lng * 1000) / 1000,
        northEast = bounds.getNorthEast(),
        maxLat = northEast.lat, // Math.round(northEast.lat * 1000) / 1000,
        maxLon = northEast.lng, // Math.round(northEast.lng * 1000) / 1000,
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
    //console.info("updateDataSource", { queryParams, zoomLevel, thresholdZoomLevel });
    //console.trace("updateDataSource");

    //kendo.ui.progress($("#map"), true);
    if (zoomLevel >= thresholdZoomLevel) {
        const queryString = new URLSearchParams(queryParams).toString(),
            wikidata_url = './etymologyMap.php?' + queryString;

        prepareWikidataLayers(map, wikidata_url);
        const wikidata_source = map.getSource("wikidata_source");
        console.info("Wikidata dataSource update", { queryParams, wikidata_url, wikidata_source });

        //showSnackbar("Fetching data...", "lightblue");
        if (wikidata_source) {
            wikidata_source.setData(wikidata_url);
        } else {
            console.error("updateDataSource: missing wikidata_source");
        }
    } else if (zoomLevel < minZoomLevel) {
        prepareGlobalLayers(map);

        //showSnackbar("Please zoom more to see data", "orange");
    } else {
        //queryParams.onlySkeleton = false;
        queryParams.onlyCenter = true;
        const queryString = new URLSearchParams(queryParams).toString(),
            elements_url = './elements.php?' + queryString;

        prepareElementsLayers(map, elements_url);
        const elements_source = map.getSource("elements_source");
        console.info("Overpass dataSource update", { queryParams, elements_url, elements_source });

        //showSnackbar("Fetching data...", "lightblue");
        if (elements_source) {
            elements_source.setData(elements_url);
        } else {
            console.error("updateDataSource: missing elements_source");
        }
    }
}

let isColorSchemeDropdownInitialized = false;

/**
 * Initializes the high-zoom-level complete (un-clustered) layer.
 * 
 * The order of declaration is important:
 * initWikidataLayer() adds the click handler. If a point and a polygon are overlapped, the point has precedence. This is imposed by declaring it first.
 * On the other side, the polygon must be show underneath the point. This is imposed by specifying the second parameter of addLayer()
 * 
 * @param {Map} map
 * @param {string} wikidata_url
 * @see https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/#geojson
 * @see https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/#geojson-attribution
 * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map#addlayer
 * @see https://docs.mapbox.com/mapbox-gl-js/example/geojson-layer-in-stack/
 */
function prepareWikidataLayers(map, wikidata_url) {
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
            "minzoom": thresholdZoomLevel,
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
            "minzoom": thresholdZoomLevel,
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
            "minzoom": thresholdZoomLevel,
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
            "minzoom": thresholdZoomLevel,
            'paint': {
                'fill-color': colorSchemes[defaultColorScheme].color,
                'fill-opacity': 0.5,
                'fill-outline-color': "rgba(0, 0, 0, 0)",
            }
        }, "wikidata_layer_polygon_border");
        initWikidataLayer(map, "wikidata_layer_polygon_fill");
    }

    if (!isColorSchemeDropdownInitialized) {
        colorControl = new EtymologyColorControl();
        setTimeout(() => map.addControl(colorControl, 'top-left'), 100); // Delay needed to make sure the dropdown is always under the search bar
        isColorSchemeDropdownInitialized = true;
    }
}

/**
 * Completes low-level details of the high zoom Wikidata layer
 * 
 * @param {Map} map
 * @param {string} layerID 
 * 
 * @see https://docs.mapbox.com/mapbox-gl-js/example/polygon-popup-on-click/
 * @see https://docs.mapbox.com/mapbox-gl-js/example/popup-on-click/
 */
function initWikidataLayer(map, layerID) {
    // When a click event occurs on a feature in the states layer,
    // open a popup at the location of the click, with description
    // HTML from the click event's properties.
    // https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:click
    map.on('click', layerID, function(e) {
        if (e.popupAlreadyShown) {
            console.info("initWikidataLayer: etymology popup already shown", { layerID, e });
        } else {
            // https://docs.mapbox.com/mapbox-gl-js/api/markers/#popup
            const popup = new mapboxgl.Popup({
                    maxWidth: "none",
                    className: "oem_etymology_popup"
                })
                .setLngLat(map.getBounds().getNorthWest())
                //.setMaxWidth('95vw')
                //.setOffset([10, 0])
                //.setHTML(featureToHTML(e.features[0]));
                .setHTML('<div class="detail_wrapper"></div>')
                .addTo(map);
            console.info("initWikidataLayer: showing etymology popup", { layerID, e, popup });
            popup.getElement().querySelector(".detail_wrapper").appendChild(featureToElement(e.features[0]));
            e.popupAlreadyShown = true; // https://github.com/mapbox/mapbox-gl-js/issues/5783#issuecomment-511555713
        }
    });

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
        'circle-radius': [
            'step', ['get', field],
            20, minThreshold, // count < minThreshold => 15px circle
            30, maxThreshold, // minThreshold <= count < maxThreshold => 30px circle
            40 // count > maxThreshold => 40px circle
        ]
    };
}

/**
 * Initializes the mid-zoom-level clustered layer.
 * 
 * @param {Map} map
 * @param {string} elements_url
 * @see https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/#geojson
 * @see https://docs.mapbox.com/mapbox-gl-js/example/cluster/
 * Add a new source from our GeoJSON data and set the 'cluster' option to true.
 * GL-JS will add the point_count property to your source data.
 * //@see https://docs.mapbox.com/mapbox-gl-js/example/heatmap-layer/
 */
function prepareElementsLayers(map, elements_url) {
    if (!map.getSource("elements_source")) {
        map.addSource('elements_source', {
            type: 'geojson',
            //buffer: 512,
            data: elements_url,
            cluster: true,
            //clusterMaxZoom: thresholdZoomLevel, // Max zoom to cluster points on
            //clusterMaxZoom: minZoomLevel, // Min zoom to cluster points on
            clusterRadius: 125, // Radius of each cluster when clustering points (defaults to 50)
        });
    }

    if (!map.getLayer("elements_layer_cluster")) {
        map.addLayer({
            id: 'elements_layer_cluster',
            source: 'elements_source',
            type: 'circle',
            maxzoom: thresholdZoomLevel,
            minzoom: minZoomLevel,
            filter: ['has', 'point_count'],
            paint: clusterPaintFromField('point_count'),
        });
    }

    if (!map.getLayer("elements_layer_count")) {
        map.addLayer({
            id: 'elements_layer_count',
            type: 'symbol',
            source: 'elements_source',
            maxzoom: thresholdZoomLevel,
            minzoom: minZoomLevel,
            filter: ['has', 'point_count'],
            layout: {
                'text-field': '{point_count_abbreviated}',
                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                'text-size': 12
            }
        });

        // inspect a cluster on click
        map.on('click', 'elements_layer_cluster', (e) => {
            const features = map.queryRenderedFeatures(e.point, {
                    layers: ['elements_layer_cluster']
                }),
                clusterId = features[0].properties.cluster_id,
                center = features[0].geometry.coordinates;
            console.info('Click elements_layer_cluster', features, clusterId, center);
            map.getSource('elements_source').getClusterExpansionZoom(
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

        map.on('mouseenter', 'elements_layer_cluster', () => map.getCanvas().style.cursor = 'pointer');
        map.on('mouseleave', 'elements_layer_cluster', () => map.getCanvas().style.cursor = '');
    }

    if (!map.getLayer("elements_layer_point")) {
        map.addLayer({
            id: 'elements_layer_point',
            type: 'circle',
            source: 'elements_source',
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

        map.on('click', 'elements_layer_point', (e) => {
            const features = map.queryRenderedFeatures(e.point, {
                    layers: ['elements_layer_point']
                }),
                center = features[0].geometry.coordinates;
            console.info('Click elements_layer_point', features, center);
            map.easeTo({
                center: center,
                zoom: thresholdZoomLevel + 0.1
            });
        });

        map.on('mouseenter', 'elements_layer_point', () => map.getCanvas().style.cursor = 'pointer');
        map.on('mouseleave', 'elements_layer_point', () => map.getCanvas().style.cursor = '');
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
        lat = Math.round(map.getCenter().lat * 10000) / 10000,
        lon = Math.round(map.getCenter().lng * 10000) / 10000,
        zoom = Math.round(map.getZoom() * 10) / 10;
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
 * @param {Map} map
 * 
 * @see prepareElementsLayers
 */
function prepareGlobalLayers(map) {
    if (!map.getSource("global_source")) {
        map.addSource('global_source', {
            type: 'geojson',
            data: './global-map.geojson',
            cluster: true,
            //clusterMaxZoom: minZoomLevel, // Max zoom to cluster points on
            clusterRadius: 125, // Radius of each cluster when clustering points (defaults to 50)
            clusterProperties: {
                "el_num": ["+", [
                    "coalesce", ["get", "el_num"],
                    ["get", "num"]
                ]]
            },
            clusterMinPoints: 1,
        });
    }

    if (!map.getLayer("global_layer_cluster")) {
        map.addLayer({
            id: 'global_layer_cluster',
            source: 'global_source',
            type: 'circle',
            maxzoom: minZoomLevel,
            filter: ['has', "el_num"],
            paint: clusterPaintFromField("el_num"),
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

    if (!map.getLayer("global_layer_count")) {
        map.addLayer({
            id: 'global_layer_count',
            type: 'symbol',
            source: 'global_source',
            maxzoom: minZoomLevel,
            filter: ['has', "el_num"],
            layout: {
                'text-field': '{el_num}',
                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                'text-size': 12
            }
        });
    }
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
function featureToElement(feature) {
    const etymologies = JSON.parse(feature.properties.etymologies),
        detail_template = document.getElementById('detail_template'),
        etymology_template = document.getElementById('etymology_template'),
        detail_container = detail_template.content.cloneNode(true),
        //template_container = document.createDocumentFragment(),
        element_wikipedia_button = detail_container.querySelector('.element_wikipedia_button'),
        element_commons_button = detail_container.querySelector('.element_commons_button'),
        etymologies_container = detail_container.querySelector('.etymologies_container'),
        OSM_URL = 'https://www.openstreetmap.org/' + feature.properties.osm_type + '/' + feature.properties.osm_id;
    //template_container.appendChild(detail_container);
    console.info("featureToElement", {
        el_id: feature.properties.el_id,
        feature,
        etymologies,
        detail_container,
        etymologies_container
    });

    if (feature.properties.name) {
        detail_container.querySelector('.element_name').innerText = '📍 ' + feature.properties.name;
    }

    if (feature.properties.wikipedia) {
        element_wikipedia_button.href = 'https://www.wikipedia.org/wiki/' + feature.properties.wikipedia;
        element_wikipedia_button.style.display = 'inline-flex';
    } else {
        element_wikipedia_button.style.display = 'none';
    }

    if (feature.properties.commons) {
        element_commons_button.href = 'https://commons.wikimedia.org/wiki/' + feature.properties.commons;
        element_commons_button.style.display = 'inline-flex';
    } else {
        element_commons_button.style.display = 'none';
    }

    detail_container.querySelector('.osm_button').href = OSM_URL;
    //detail_container.querySelector('.ety_error_button').href = 'https://www.openstreetmap.org/note/new#layers=N&map=18/' + feature.properties.point_lat + '/' + feature.properties.point_lon;

    let coord = feature.geometry.coordinates;
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
            etymology.querySelector('.wikidata_button').href = 'https://www.wikidata.org/wiki/' + ety.wikidata;

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
                        const link = document.createElement('a'),
                            picture = document.createElement('img');

                        // Example of img: "http://commons.wikimedia.org/wiki/Special:FilePath/Dal%20Monte%20Casoni.tif"
                        link.href = img.replace(/^http:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//, 'https://commons.wikimedia.org/wiki/File:');
                        // Link to original image page, example: "https://commons.wikimedia.org/wiki/File:Dal_Monte_Casoni.tif"
                        picture.src = img + '?width=500px';
                        // Link to thumbnail, example: "http://commons.wikimedia.org/wiki/Special:FilePath/Dal%20Monte%20Casoni.tif?width=500px"

                        link.title = "Etymology picture via Wikimedia Commons";
                        picture.alt = "Etymology picture via Wikimedia Commons";
                        link.appendChild(picture);
                        pictures.appendChild(link);
                    }
                });
            } else {
                pictures.style.display = 'none';
            }

            if (ety.from_name_etymology || ety.from_subject) {
                etymology.querySelector('.etymology_src').innerText = "OpenStreetMap";
                etymology.querySelector('.etymology_src').href = OSM_URL;
            } else if (ety.from_wikidata) {
                etymology.querySelector('.etymology_src').innerText = "Wikidata";
                etymology.querySelector('.etymology_src').href = 'https://www.wikidata.org/wiki/' + ety.from_wikidata_cod + '#' + ety.from_wikidata_prop;
            } else {
                etymology.querySelector('.etymology_src_wrapper').style.display = 'none';
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
        if (typeof Sentry != 'undefined')
            Sentry.captureMessage("Undefined mapboxgl", { level: "error" });
    } else if (!mapboxgl.supported()) {
        alert('Your browser does not support Mapbox GL');
        if (typeof Sentry != 'undefined')
            Sentry.captureMessage("Device/Browser does not support Mapbox GL", { level: "error" });
    } else {
        initMapPreview();
        initMap();
        //setCulture(); //! Map style likely still loading, setLayoutProperty() will cause an error
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