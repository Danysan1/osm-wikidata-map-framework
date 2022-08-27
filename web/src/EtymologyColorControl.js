//import { Map } from 'maplibre-gl';
import { Map } from 'mapbox-gl';

import { Chart, ArcElement, PieController } from 'chart.js';
import { logErrorMessage, setFragmentParams } from './common';

Chart.register(ArcElement, PieController);

const colorSchemes = {
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
    /**
     * 
     * @param {string} startColorScheme 
     */
    constructor(startColorScheme) {
        this._startColorScheme = startColorScheme;
    }

    /**
     * 
     * @param {Map} map 
     * @returns {HTMLElement}
     */
    onAdd(map) {
        this._map = map;

        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl etymology-color-ctrl';

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
            if (value == this._startColorScheme) {
                option.selected = true;
            }
            this._ctrlDropDown.appendChild(option);
        }
        this._ctrlDropDown.dispatchEvent(new Event("change"))

        //setFragmentParams(undefined, undefined, undefined, this._startColorScheme); //! Creates a bug when using geo-localization or location search

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
        console.info("EtymologyColorControl setColorScheme", { colorScheme });
        if (!this._ctrlDropDown || !this._ctrlDropDown.options) {
            console.warn("setColorScheme: dropdown not yet initialized");
        } else {
            this._ctrlDropDown.options.forEach(option => {
                if (option.value === colorScheme) {
                    option.selected = true;
                    this._ctrlDropDown.dispatchEvent(new Event("change"));
                    return;
                }
            });
            console.error("EtymologyColorControl setColorScheme: invalid color scheme", { colorScheme });
        }
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
                    minLat: Math.floor(minLat * 1000) / 1000, // 0.1234 => 0.124 
                    minLon: Math.floor(minLon * 1000) / 1000,
                    maxLat: Math.ceil(maxLat * 1000) / 1000, // 0.1234 => 0.123
                    maxLon: Math.ceil(maxLon * 1000) / 1000,
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

export { EtymologyColorControl, colorSchemes };
