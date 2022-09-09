import { IControl, Expression, Map } from 'mapbox-gl';

// https://www.chartjs.org/docs/latest/getting-started/integration.html#bundlers-webpack-rollup-etc
import { Chart, ArcElement, PieController, Tooltip, Legend, ChartData } from 'chart.js';

import { logErrorMessage } from './monitoring';
import { getCorrectFragmentParams, setFragmentParams } from './fragment';

interface ColorScheme {
    id: string;
    text: string;
    color: string | Expression;
    colorField: string | null;
    urlCode: string | null;
}

const colorSchemes: ColorScheme[] = [
    { id: "blue", text: 'Uniform blue', color: '#3bb2d0', colorField: null, urlCode: null },
    {
        id: "gender",
        colorField: 'gender_color',
        text: 'By gender',
        color: ["coalesce", ['get', 'gender_color'], "#223b53"],
        urlCode: "genderStats",
    },
    {
        id: "type",
        colorField: 'type_color',
        text: 'By type',
        color: ["coalesce", ['get', 'type_color'], "#223b53"],
        urlCode: "typeStats",
    },
    { id: "black", text: 'Uniform black', color: '#223b53', colorField: null, urlCode: null },
    { id: "red", text: 'Uniform red', color: '#e55e5e', colorField: null, urlCode: null },
    { id: "orange", text: 'Uniform orange', color: '#fbb03b', colorField: null, urlCode: null },
];

interface EtymologyStat {
    color: string;
    name: string;
    count: number;
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
class EtymologyColorControl implements IControl {
    private _startColorScheme: string;
    private _chartInitInProgress: boolean;
    private _map: Map | null;
    private _container: HTMLDivElement | null;
    private _ctrlDropDown: HTMLSelectElement | null;
    private _chartXHR: XMLHttpRequest | null;
    private _chartDomElement: HTMLCanvasElement | null;
    private _chartJsObject: Chart | null;

    constructor(startColorScheme: string) {
        this._startColorScheme = startColorScheme;
        this._chartInitInProgress = false;
        this._map = null;
        this._container = null;
        this._ctrlDropDown = null;
        this._chartXHR = null;
        this._chartDomElement = null;
        this._chartJsObject = null;
    }

    onAdd(map: Map): HTMLElement {
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

        colorSchemes.forEach(scheme => {
            const option = document.createElement('option');
            option.innerText = scheme.text;
            option.value = scheme.id;
            if (scheme.id == this._startColorScheme) {
                option.selected = true;
            }
            this._ctrlDropDown?.appendChild(option);
        });
        this._ctrlDropDown.dispatchEvent(new Event("change"))

        //setFragmentParams(undefined, undefined, undefined, this._startColorScheme); //! Creates a bug when using geo-localization or location search

        return this._container;
    }

    onRemove() {
        this._container?.parentNode?.removeChild(this._container);
        this._map = null;
    }

    btnClickHandler(event: MouseEvent) {
        console.info("EtymologyColorControl button click", event);
        if (this._ctrlDropDown)
            this._ctrlDropDown.className = 'visibleDropDown';
    }

    /**
     * @returns {string} The current color scheme
     */
    getColorScheme(): string {
        const colorScheme = this._ctrlDropDown?.value;
        if (typeof colorScheme != 'string')
            throw new Error("Bad dropdown or dropdown value");
        return colorScheme;
    }

    setColorScheme(colorScheme: string) {
        console.info("EtymologyColorControl setColorScheme", { colorScheme });
        if (!this._ctrlDropDown || !this._ctrlDropDown.options) {
            console.warn("setColorScheme: dropdown not yet initialized");
        } else {
            Array.prototype.forEach(option => {
                if (option.value === colorScheme) {
                    option.selected = true;
                    this._ctrlDropDown?.dispatchEvent(new Event("change"));
                    return;
                }
            }, this._ctrlDropDown.options);
            console.error("EtymologyColorControl setColorScheme: invalid color scheme", { colorScheme });
        }
    }

    dropDownClickHandler(event: Event) {
        const dropDown = event.target;
        if (!(dropDown instanceof HTMLSelectElement))
            throw new Error("dropDownClickHandler: bad dropdown");
        const colorScheme = dropDown.value,
            colorSchemeObj = colorSchemes.find(scheme => scheme.id == colorScheme);
        let color: string | Expression;

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
            if (this._map?.getLayer(layerID)) {
                this._map.setPaintProperty(layerID, property, color);
            } else {
                console.warn("Layer does not exist, can't set property", { layerID, property, color });
            }
        });

        this.updateChart(event);

        setFragmentParams(undefined, undefined, undefined, colorScheme);
        //updateDataSource(event);
    }

    updateChart(event: Event) {
        if (!this._ctrlDropDown) {
            console.error("updateChart: dropodown not inizialized", { event });
            return;
        } else {
            const dropdown = this._ctrlDropDown,
                colorScheme = colorSchemes.find(scheme => scheme.id == dropdown.value),
                bounds = this._map?.getBounds();
            //console.info("updateChart", { event, colorScheme });

            if (!bounds) {
                console.error("updateChart: missing bounds", { event });
            } else if (colorScheme && colorScheme.urlCode) {
                console.info("updateChart main: colorScheme is ok", { event, colorScheme });
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
                        minLat: (Math.floor(minLat * 1000) / 1000).toString(), // 0.1234 => 0.124 
                        minLon: (Math.floor(minLon * 1000) / 1000).toString(),
                        maxLat: (Math.ceil(maxLat * 1000) / 1000).toString(), // 0.1234 => 0.123
                        maxLon: (Math.ceil(maxLon * 1000) / 1000).toString(),
                        language,
                    },
                    queryString = new URLSearchParams(queryParams).toString(),
                    stats_url = './stats.php?' + queryString,
                    xhr = new XMLHttpRequest();
                xhr.onreadystatechange = (e) => {
                    const readyState = xhr.readyState,
                        status = xhr.status,
                        data = {
                            labels: [],
                            datasets: [{
                                data: [],
                                backgroundColor: [],
                            }]
                        } as ChartData<"pie">;
                    if (readyState == XMLHttpRequest.DONE) {
                        if (status == 200) {
                            JSON.parse(xhr.responseText).forEach((row: EtymologyStat) => {
                                (data.datasets[0].backgroundColor as string[]).push(row.color);
                                data.labels?.push(row["name"]);
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
                console.info("updateChart main: no colorScheme, removing", { event, colorScheme });
                if (event.type && event.type == 'change')
                    this._ctrlDropDown.className = 'hiddenElement';
                this.removeChart();
            }
        }
    }

    /**
     * 
     * @see https://www.chartjs.org/docs/latest/general/data-structures.html
     */
    setChartData(data: ChartData<"pie">) {
        console.info("setChartData", {
            container: this._container,
            chartDomElement: this._chartDomElement,
            chartJsObject: this._chartJsObject,
            data
        });
        if (this._chartJsObject && this._chartDomElement) {
            // https://www.chartjs.org/docs/latest/developers/updates.html
            this._chartJsObject.data.datasets[0].backgroundColor = data.datasets[0].backgroundColor;
            this._chartJsObject.data.labels = data.labels;
            this._chartJsObject.data.datasets[0].data = data.datasets[0].data;

            this._chartJsObject.update();
        } else if (this._chartInitInProgress) {
            console.info("setChartData: chart already loading");
        } else {
            this._chartInitInProgress = true;
            console.info("setChartData: Loading chart.js and initializing the chart");
            this.initChart(data);
        }
    }

    initChart(data: ChartData<"pie">) {
        this._chartDomElement = document.createElement('canvas');
        this._chartDomElement.className = 'chart';
        if (this._container)
            this._container.appendChild(this._chartDomElement);
        else
            throw new Error("Missing container");
        const ctx = this._chartDomElement.getContext('2d');
        if (!ctx)
            throw new Error("Missing context");

        Chart.register(ArcElement, PieController, Tooltip, Legend);
        this._chartJsObject = new Chart(ctx, {
            type: "pie",
            data: data,
            /*options: {
                animation: {
                    animateScale: true,
                }
            }*/
        });
        this._chartInitInProgress = false;
    }

    removeChart() {
        if (this._chartDomElement) {
            try {
                this._container?.removeChild(this._chartDomElement);
                this._chartDomElement = null;
                this._chartJsObject = null;
            } catch (error) {
                console.warn("Error removing old chart", { error, container: this._container, chart: this._chartDomElement });
            }
        }
    }
}

/**
 * @return {ColorScheme}
 */
function getCurrentColorScheme() {
    const colorSchemeId = getCorrectFragmentParams().colorScheme;
    let colorScheme = colorSchemes.find(scheme => scheme.id == colorSchemeId);
    if (!colorScheme) {
        colorScheme = colorSchemes[0];
        console.warn("getCurrentColorScheme: error getting color scheme, using fallback", { colorSchemeId, colorScheme });
    }
    return colorScheme;
}

export { EtymologyColorControl, getCurrentColorScheme };
