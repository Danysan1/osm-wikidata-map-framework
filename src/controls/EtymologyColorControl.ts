// import { LngLatBounds, MapLibreEvent as MapEvent, MapSourceDataEvent } from 'maplibre-gl';

import { LngLatBounds, MapboxEvent as MapEvent, MapSourceDataEvent } from 'mapbox-gl';

import { ChartData } from "chart.js";
import { getCorrectFragmentParams } from '../fragment';
import { debugLog } from '../config';
import { ColorScheme, ColorSchemeID, colorSchemes } from '../colorScheme.model';
import { DropdownControl, DropdownItem } from './DropdownControl';
import { showSnackbar } from '../snackbar';
import { TFunction } from 'i18next';
import { WikidataService, statsQueries } from '../services/WikidataService';
import { Etymology } from '../EtymologyElement';

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
    private _lastWikidataIDs?: string[];
    private _lastColorSchemeID?: string;
    private _t: TFunction;

    private baseChartData = {
        labels: [],
        datasets: [{
            data: [],
            backgroundColor: [],
        }]
    } as ChartData<"pie">;

    constructor(
        startColorScheme: ColorSchemeID,
        onSchemeChange: (colorScheme: ColorSchemeID) => void,
        t: TFunction,
        sourceId: string,
        minZoomLevel: number
    ) {
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
            true,
            minZoomLevel,
            () => this.setCurrentID(getCorrectFragmentParams().colorScheme),
            (e: MapSourceDataEvent) => {
                const zoomLevel = e.target.getZoom(),
                    validZoomLevel = zoomLevel >= minZoomLevel,
                    sourceLoaded = e.isSourceLoaded && e.dataType == "source" && sourceId == e.sourceId;
                if (validZoomLevel && sourceLoaded) {
                    debugLog("EtymologyColorControl: updating chart ", { zoomLevel, minZoomLevel });
                    this.updateChart(e, getCorrectFragmentParams().source);
                }
            }
        );
        this._chartInitInProgress = false;
        this._chartXHR = null;
        this._t = t;
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

            if (colorSchemeID === 'source') {
                this.loadSourceChartData();
            } else if (statsQueries[colorSchemeID]) {
                this.downloadChartDataFromWikidata(colorSchemeID);
                if (event)
                    this.showDropdown();
            } else if (bounds && colorScheme?.urlCode) {
                this.downloadChartDataFromBackend(bounds, colorScheme, source);
                if (event)
                    this.showDropdown();
            } else if (event?.type === 'change') {
                debugLog("updateChart: change event with no query nor urlCode, hiding", { event, colorSchemeID });
                this.showDropdown(false);
            }
        }
    }

    mapStatsToChartData(stats: EtymologyStat[]): ChartData<"pie"> {
        const data = structuredClone(this.baseChartData);
        stats.forEach((row: EtymologyStat) => {
            if (row.name && row.count) {
                data.labels?.push(row.name);
                (data.datasets[0].backgroundColor as string[]).push(row.color || '#223b53');
                data.datasets[0].data.push(row.count);
            }
        });
        return data;
    }

    loadSourceChartData() {
        const features = this.getMap()?.querySourceFeatures("wikidata_source");
        if (features) {
            const counts = {
                osm_wikidata: 0,
                osm_text: 0,
                wikidata: 0,
                propagation: 0,
            };
            features.forEach(feature => {
                const rawEtymologies = feature.properties?.etymologies,
                    etymologies = (typeof rawEtymologies === 'string' ? JSON.parse(rawEtymologies) : rawEtymologies) as Etymology[];
                if (etymologies.some(etymology => !etymology.propagated && etymology.from_osm))
                    counts.osm_wikidata++;
                else if (etymologies.some(etymology => !etymology.propagated && etymology.from_wikidata))
                    counts.wikidata++;
                else if (etymologies.some(etymology => etymology.propagated))
                    counts.propagation++;
                else
                    counts.osm_text++;
            });
            const stats: EtymologyStat[] = [
                { name: "OpenStreetMap", color: '#33ff66', id: 'osm_wikidata', count: counts.osm_wikidata },
                { name: "Wikidata", color: '#3399ff', id: 'wikidata', count: counts.wikidata },
                { name: "Propagation", color: '#ff3333', id: 'propagation', count: counts.propagation },
                { name: "OpenStreetMap (text only)", color: "#223b53", id: "osm_text", count: counts.osm_text }
            ]
            //console.info("Source stats:", stats);
            this.setChartData(this.mapStatsToChartData(stats));
        }
    }

    async downloadChartDataFromWikidata(colorSchemeID: ColorSchemeID) {
        const sparqlQuery = statsQueries[colorSchemeID];
        if (!sparqlQuery)
            throw new Error("downloadChartData: can't download data for a color scheme with no query - " + colorSchemeID);

        const wikidataIDs = this.getMap()
            ?.querySourceFeatures("wikidata_source")
            ?.map(feature => feature.properties?.etymologies)
            ?.flatMap(etymologies => (typeof etymologies === 'string' ? JSON.parse(etymologies) : etymologies) as Etymology[])
            ?.map(etymology => etymology.wikidata)
            ?.filter(id => typeof id === 'string')
            ?.sort() as string[] || []
        if (colorSchemeID === this._lastColorSchemeID && wikidataIDs.length === this._lastWikidataIDs?.length && this._lastWikidataIDs.every((id, i) => wikidataIDs[i] === id)) {
            console.info("Skipping stats update");
        } else {
            this._lastColorSchemeID = colorSchemeID;
            this._lastWikidataIDs = wikidataIDs;
            const statsData = await new WikidataService().fetchStats(wikidataIDs, sparqlQuery),
                data = this.mapStatsToChartData(statsData);
            this.setChartData(data);
        }
    }

    downloadChartDataFromBackend(bounds: LngLatBounds, colorScheme: ColorScheme, source?: string) {
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
            this._lastQueryString = queryString;
            xhr.onreadystatechange = (e) => this.handleChartXHRStateChange(xhr, e);
            xhr.open('GET', stats_url, true);
            xhr.send();

            if (this._chartXHR)
                this._chartXHR.abort();
            this._chartXHR = xhr;
        }
    }

    handleChartXHRStateChange(xhr: XMLHttpRequest, e: Event) {
        if (xhr.readyState === XMLHttpRequest.UNSENT || xhr.status === 0) {
            debugLog("XHR aborted", { xhr, e });
        } else if (xhr.readyState == XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                this.setChartData(this.mapStatsToChartData(JSON.parse(xhr.responseText)));
            } else if (xhr.status === 500 && xhr.responseText.includes("Not implemented")) {
                this.removeChart();
                showSnackbar(this._t("color_scheme.not_available"), "lightsalmon");
            } else {
                console.error("XHR error", { xhr, e });
                //if (event.type && event.type == 'change')
                //    this.hideDropdown();
                this.removeChart();
            }
        }
    }

    /**
     * Initializes or updates the chart with the given data
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
            this.updateChartObject(data);
        } else if (this._chartInitInProgress) {
            debugLog("setChartData: chart already loading");
        } else {
            debugLog("setChartData: Loading chart.js and initializing the chart");
            this.initChartObject(data);
        }
    }

    /**
     * Imports chart.js and initializes the chart with the given data
     * 
     * @see https://www.chartjs.org/docs/latest/getting-started/integration.html#bundlers-webpack-rollup-etc
     * @see https://www.chartjs.org/docs/latest/charts/doughnut.html#pie
     */
    async initChartObject(data: ChartData<"pie">) {
        if (this._chartJsObject)
            throw new Error("initChartObject: chart already initialized");
        if (this._chartInitInProgress)
            throw new Error("initChartObject: chart initialization already in progress");

        this._chartInitInProgress = true
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

    /**
     * Updates the (already initialized) chart.js chart with the given data
     * 
     * @see https://www.chartjs.org/docs/latest/developers/updates.html
     */
    updateChartObject(data: ChartData<"pie">) {
        if (!this._chartJsObject)
            throw new Error("updateChartObject: chart not yet initialized");

        this._chartJsObject.data.datasets[0].backgroundColor = data.datasets[0].backgroundColor;
        this._chartJsObject.data.labels = data.labels;
        this._chartJsObject.data.datasets[0].data = data.datasets[0].data;
        this._chartJsObject.update();
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
