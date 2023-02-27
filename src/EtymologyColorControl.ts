//import { Expression, MapboxEvent } from 'maplibre-gl';
import { Expression, MapboxEvent } from 'mapbox-gl';

// https://www.chartjs.org/docs/latest/getting-started/integration.html#bundlers-webpack-rollup-etc
import { Chart, ArcElement, PieController, Tooltip, Legend, ChartData } from 'chart.js';

import { logErrorMessage } from './monitoring';
import { getCorrectFragmentParams, setFragmentParams } from './fragment';
import { debugLog } from './config';
import { ColorScheme, ColorSchemeID, colorSchemes } from './colorScheme.model';
import { DropdownControl, DropdownItem } from './DropdownControl';

export interface EtymologyStat {
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
class EtymologyColorControl extends DropdownControl {
    private _chartInitInProgress: boolean;
    private _chartXHR: XMLHttpRequest | null;
    private _chartDomElement: HTMLCanvasElement | null;
    private _chartJsObject: Chart | null;

    constructor(startColorScheme: ColorSchemeID) {
        const dropdownItems: DropdownItem[] = Object.entries(colorSchemes).map(([id, item]) => ({
            id,
            text: item.text,
            onSelect: (event) => this.onColorSchemeSelect(id, event)
        }));
        super(
            '📊', //'🎨',
            dropdownItems,
            startColorScheme,
            'Choose color scheme',
            true
        );
        this._chartInitInProgress = false;
        this._chartXHR = null;
        this._chartDomElement = null;
        this._chartJsObject = null;
    }

    /**
     * Get the currently selected color scheme
     */
    getColorScheme(): string {
        const dropdown = this.getDropdown();
        if (!dropdown)
            throw new Error("Missing color control dropdown");
        const colorScheme = dropdown.value;
        if (typeof colorScheme != 'string')
            throw new Error("Bad color control dropdown value");
        return colorScheme;
    }

    setColorScheme(colorScheme: ColorSchemeID) {
        debugLog("EtymologyColorControl setColorScheme", { colorScheme });
        const dropdown = this.getDropdown();
        if (!dropdown?.options) {
            console.warn("setColorScheme: dropdown not yet initialized");
        } else {
            Array.prototype.forEach(option => {
                if (option.value === colorScheme) {
                    option.selected = true;
                    dropdown.dispatchEvent(new Event("change"));
                    return;
                }
            }, dropdown.options);
            console.error("EtymologyColorControl setColorScheme: invalid color scheme", { colorScheme });
        }
    }

    onColorSchemeSelect(colorSchemeID: string, event: Event) {
        const colorSchemeObj = colorSchemes[colorSchemeID as ColorSchemeID],
            map = this.getMap();
        let color: string | Expression;

        if (colorSchemeObj) {
            color = colorSchemeObj.color;
        } else {
            logErrorMessage("Invalid selected color scheme", "error", { colorSchemeID });
            color = '#3bb2d0';
        }
        debugLog("EtymologyColorControl dropDown click", { event, colorSchemeID, colorSchemeObj, color });

        [
            ["wikidata_layer_point", "circle-color"],
            ["wikidata_layer_lineString", 'line-color'],
            ["wikidata_layer_polygon_fill", 'fill-color'],
            ["wikidata_layer_polygon_border", 'line-color'],
        ].forEach(([layerID, property]) => {
            if (map?.getLayer(layerID)) {
                map.setPaintProperty(layerID, property, color);
            } else {
                console.warn("Layer does not exist, can't set property", { layerID, property, color });
            }
        });

        this.updateChart(event);

        setFragmentParams(undefined, undefined, undefined, colorSchemeID as ColorSchemeID);
        //updateDataSource(event);
    }

    updateChart(event?: MapboxEvent | Event, source?: string) {
        const dropdown = this.getDropdown();
        if (!dropdown) {
            console.error("updateChart: dropdown not inizialized", { event });
            return;
        } else {
            const colorSchemeID = dropdown.value as ColorSchemeID,
                colorScheme = colorSchemes[colorSchemeID],
                bounds = this.getMap()?.getBounds();
            debugLog("updateChart", { event, colorSchemeID, colorScheme });

            if (!bounds) {
                console.error("updateChart: missing bounds", { event });
            } else if (colorScheme && colorScheme.urlCode) {
                debugLog("updateChart main: colorScheme is ok", { event, colorScheme });
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
                        source: source ?? getCorrectFragmentParams().source,
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
                            debugLog("XHR aborted", { xhr, readyState, status, e });
                        } else {
                            console.error("XHR error", { xhr, readyState, status, e });
                            //if (event.type && event.type == 'change')
                            //    this.hideDropdown();
                            this.removeChart();
                        }
                    }
                }
                xhr.open('GET', stats_url, true);
                xhr.send();
                this._chartXHR = xhr;

                if (event)
                    this.showDropdown();
            } else {
                debugLog("updateChart main: no colorScheme, removing", { event, colorScheme });
                if (event?.type && event?.type == 'change')
                    this.showDropdown(false);
                this.removeChart();
            }
        }
    }

    /**
     * 
     * @see https://www.chartjs.org/docs/latest/general/data-structures.html
     */
    setChartData(data: ChartData<"pie">) {
        debugLog("setChartData", {
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
            debugLog("setChartData: chart already loading");
        } else {
            this._chartInitInProgress = true;
            debugLog("setChartData: Loading chart.js and initializing the chart");
            this.initChart(data);
        }
    }

    initChart(data: ChartData<"pie">) {
        this._chartDomElement = document.createElement('canvas');
        this._chartDomElement.className = 'chart';
        const container = this.getContainer();
        if (container)
            container.appendChild(this._chartDomElement);
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
                this.getContainer()?.removeChild(this._chartDomElement);
                this._chartDomElement = null;
                this._chartJsObject = null;
            } catch (error) {
                console.warn("Error removing old chart", { error, chart: this._chartDomElement });
            }
        }
    }

    showDropdown(show = true) {
        super.showDropdown(show);

        if (!show) {
            this.removeChart();
        } else if (!this._chartDomElement) {
            this.updateChart();
        }
    }
}

function getCurrentColorScheme(): ColorScheme {
    const colorSchemeId = getCorrectFragmentParams().colorScheme;
    let colorScheme = colorSchemes[colorSchemeId];
    if (!colorScheme) {
        colorScheme = colorSchemes.blue;
        console.warn("getCurrentColorScheme: error getting color scheme, using fallback", { colorSchemeId, colorScheme });
    }
    return colorScheme;
}

export { EtymologyColorControl, getCurrentColorScheme };
