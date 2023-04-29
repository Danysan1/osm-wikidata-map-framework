//import { MaplibreEvent as MapEvent } from 'maplibre-gl';
import { LngLatBounds, MapboxEvent as MapEvent } from 'mapbox-gl';

import { ChartData } from "chart.js";
import { getCorrectFragmentParams } from '../fragment';
import { debugLog } from '../config';
import { ColorScheme, ColorSchemeID, colorSchemes } from '../colorScheme.model';
import { DropdownControl, DropdownItem } from './DropdownControl';
import { showSnackbar } from '../snackbar';
import { TFunction } from 'i18next';

export interface EtymologyStat {
    color?: string;
    id?: string;
    name?: string;
    count?: number;
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
    private _chartDomElement?: HTMLCanvasElement;
    private _chartJsObject?: import('chart.js').Chart;
    private _lastQueryString?: string;

    constructor(startColorScheme: ColorSchemeID, onSchemeChange: (colorScheme: ColorSchemeID) => void, t: TFunction) {
        const dropdownItems: DropdownItem[] = Object.entries(colorSchemes).map(([id, item]) => ({
            id,
            text: t(item.textKey),
            onSelect: (event) => {
                this.updateChart(event);
                onSchemeChange(id as ColorSchemeID);
            }
        }));
        super(
            '📊', //'🎨',
            dropdownItems,
            startColorScheme,
            "color_scheme.choose_scheme",
            true
        );
        this._chartInitInProgress = false;
        this._chartXHR = null;
    }

    updateChart(event?: MapEvent | Event, source?: string) {
        const dropdown = this.getDropdown();
        if (!dropdown) {
            console.error("updateChart: dropdown not yet initialized", { event });
            return;
        } else {
            const colorSchemeID = dropdown.value as ColorSchemeID,
                colorScheme = colorSchemes[colorSchemeID],
                bounds = this.getMap()?.getBounds();

            if (!bounds) {
                debugLog("updateChart: missing bounds", { event });
            } else if (colorScheme?.urlCode) {
                this.downloadChartData(bounds, colorScheme, source);
                if (event)
                    this.showDropdown();
            } else if (event?.type === 'change') {
                debugLog("updateChart: change event with no colorScheme URL code, hiding", { event, colorSchemeID, colorScheme });
                this.showDropdown(false);
            }
        }
    }

    downloadChartData(bounds: LngLatBounds, colorScheme: ColorScheme, source?: string) {
        if (!colorScheme?.urlCode)
            throw new Error("downloadChartData: can't download data for a color scheme with no URL code - " + colorScheme.textKey);

        const southWest = bounds.getSouthWest(),
            minLat = southWest.lat,
            minLon = southWest.lng,
            northEast = bounds.getNorthEast(),
            maxLat = northEast.lat,
            maxLon = northEast.lng,
            language = document.documentElement.lang,
            queryParams = {
                to: colorScheme?.urlCode,
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

        if (this._lastQueryString !== queryString) {
            xhr.onreadystatechange = (e) => this.handleChartXHRStateChange(xhr, e);
            xhr.open('GET', stats_url, true);
            xhr.send();

            if (this._chartXHR)
                this._chartXHR.abort();
            this._chartXHR = xhr;
            this._lastQueryString = queryString;
        }
    }

    handleChartXHRStateChange(xhr: XMLHttpRequest, e: Event) {
        const readyState = xhr.readyState,
            status = xhr.status,
            data = {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [],
                }]
            } as ChartData<"pie">;

        if (readyState == XMLHttpRequest.UNSENT || status == 0) {
            debugLog("XHR aborted", { xhr, readyState, status, e });
        } else if (readyState == XMLHttpRequest.DONE) {
            if (status == 200) {
                JSON.parse(xhr.responseText).forEach((row: EtymologyStat) => {
                    if (row.name && row.count) {
                        (data.datasets[0].backgroundColor as string[]).push(row.color || '#3bb2d0');
                        data.labels?.push(row.name);
                        data.datasets[0].data.push(row.count);
                    }
                });
                this.setChartData(data);
            } else if (status == 500 && xhr.responseText.includes("Not implemented")) {
                this.removeChart();
                showSnackbar("Statistic not implemented for this source", "lightsalmon");
            } else {
                console.error("XHR error", { xhr, readyState, status, e });
                //if (event.type && event.type == 'change')
                //    this.hideDropdown();
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

    async initChart(data: ChartData<"pie">) {
        // https://www.chartjs.org/docs/latest/getting-started/integration.html#bundlers-webpack-rollup-etc
        const { Chart, ArcElement, PieController, Tooltip, Legend } = await import('chart.js');
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
                this._chartDomElement = undefined;
                this._chartJsObject = undefined;
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
