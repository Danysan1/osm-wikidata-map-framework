import { LngLatBounds, MapLibreEvent as MapEvent, MapSourceDataEvent, ExpressionSpecification } from 'maplibre-gl';

// import { LngLatBounds, MapboxEvent as MapEvent, MapSourceDataEvent, Expression as ExpressionSpecification } from 'mapbox-gl';

import { ChartData } from "chart.js";
import { getCorrectFragmentParams } from '../fragment';
import { debugLog } from '../config';
import { ColorScheme, ColorSchemeID, colorSchemes } from '../colorScheme.model';
import { DropdownControl, DropdownItem } from './DropdownControl';
import { showSnackbar } from '../snackbar';
import { TFunction } from 'i18next';
import { WikidataStatsService, statsQueries } from '../services/WikidataStatsService';
import { Etymology, EtymologyFeatureProperties } from '../generated/owmf';

export interface EtymologyStat {
    color?: string;
    count: number;
    descr?: string;
    id?: string;
    name: string;
    subjects?: string[];
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
    private _chartInitInProgress = false;
    private _chartDomElement?: HTMLCanvasElement;
    private _chartJsObject?: import('chart.js').Chart;
    private _lastWikidataIDs?: string[];
    private _lastColorSchemeID?: string;
    private _setLayerColor: (color: string | ExpressionSpecification) => void;
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
        setLayerColor: (color: string | ExpressionSpecification) => void,
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
        this._setLayerColor = setLayerColor;
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
                this._lastColorSchemeID = colorSchemeID;
                this._lastWikidataIDs = undefined;
                this.loadSourceChartData();
            } else if (statsQueries[colorSchemeID]) {
                this.downloadChartDataFromWikidata(colorSchemeID);
                if (event)
                    this.showDropdown();
            } else if (event?.type === 'change') {
                debugLog("updateChart: change event with no query nor urlCode, hiding", { event, colorSchemeID });
                this.showDropdown(false);
                if (colorScheme?.color)
                    this._setLayerColor(colorScheme.color);
            }
        }
    }

    loadSourceChartData() {
        const osm_wikidata_IDs = new Set(),
            osm_text_names = new Set(),
            wikidata_IDs = new Set(),
            propagation_IDs = new Set();
        this.getMap()
            ?.querySourceFeatures("wikidata_source")
            ?.forEach(feature => {
                const props = feature.properties as EtymologyFeatureProperties,
                    rawEtymologies = props.etymologies,
                    etymologies = (typeof rawEtymologies === 'string' ? JSON.parse(rawEtymologies) : rawEtymologies) as Etymology[];

                etymologies.forEach(etymology => {
                    if (etymology.propagated)
                        propagation_IDs.add(etymology.wikidata);
                    else if (etymology.from_wikidata)
                        wikidata_IDs.add(etymology.wikidata);
                    else if (etymology.from_osm)
                        osm_wikidata_IDs.add(etymology.wikidata);
                    else if (props.text_etymology)
                        osm_text_names.add(props.text_etymology);
                });
            });
        const stats: EtymologyStat[] = [];
        if (propagation_IDs.size) stats.push({ name: "Propagation", color: '#ff3333', id: 'propagation', count: propagation_IDs.size });
        if (wikidata_IDs.size) stats.push({ name: "Wikidata", color: '#3399ff', id: 'wikidata', count: wikidata_IDs.size });
        if (osm_wikidata_IDs.size) stats.push({ name: "OpenStreetMap", color: '#33ff66', id: 'osm_wikidata', count: osm_wikidata_IDs.size });
        if (osm_text_names.size) stats.push({ name: "OpenStreetMap (text only)", color: "#223b53", id: "osm_text", count: osm_text_names.size });
        //console.info("Source stats:", stats);
        this.setChartStats(stats);

        this._setLayerColor([
            "case",
            ["coalesce", ["get", "propagated", ["at", 0, ["get", "etymologies"]]], false], '#ff3333',
            ["coalesce", ["get", "from_wikidata", ["at", 0, ["get", "etymologies"]]], false], '#3399ff',
            ["coalesce", ["get", "from_osm", ["at", 0, ["get", "etymologies"]]], false], '#33ff66',
            '#223b53'
        ]);
    }

    async downloadChartDataFromWikidata(colorSchemeID: ColorSchemeID) {
        const wikidataIDs = this.getMap()
            ?.querySourceFeatures("wikidata_source")
            ?.map(feature => feature.properties?.etymologies)
            ?.flatMap(etymologies => (typeof etymologies === 'string' ? JSON.parse(etymologies) : etymologies) as Etymology[])
            ?.map(etymology => etymology.wikidata)
            ?.filter(id => typeof id === 'string')
            ?.sort() as string[] || [];
        if (wikidataIDs.length === 0) {
            debugLog("Skipping stats update for 0 IDs");
        } else if (colorSchemeID === this._lastColorSchemeID && wikidataIDs.length === this._lastWikidataIDs?.length && this._lastWikidataIDs.every((id, i) => wikidataIDs[i] === id)) {
            debugLog("Skipping stats update for already downloaded IDs", { colorSchemeID, lastColorSchemeID: this._lastColorSchemeID, wikidataIDs, lastWikidataIDs: this._lastWikidataIDs });
        } else {
            debugLog("Updating stats", { colorSchemeID, lastColorSchemeID: this._lastColorSchemeID, wikidataIDs, lastWikidataIDs: this._lastWikidataIDs });
            this._lastColorSchemeID = colorSchemeID;
            this._lastWikidataIDs = wikidataIDs;
            try {
                const stats = await new WikidataStatsService().fetchStats(wikidataIDs, colorSchemeID);
                if (stats.length > 0) {
                    this.setChartStats(stats)
                    this.setLayerColorForStats(stats);
                } else {
                    throw new Error("Empty stats result");
                }
            } catch (e) {
                console.error("Stats fetch error", e);
                this._lastWikidataIDs = undefined;
                this.removeChart();
            }
        }
    }

    /**
     * Initializes or updates the chart with the given sttistics
     */
    setChartStats(stats: EtymologyStat[]) {
        const data = structuredClone(this.baseChartData);
        stats.forEach((row: EtymologyStat) => {
            data.labels?.push(row.name);
            (data.datasets[0].backgroundColor as string[]).push(row.color || '#223b53');
            data.datasets[0].data.push(row.count);
        });
        this.setChartData(data);
    }

    setLayerColorForStats(stats: EtymologyStat[]) {
        const data: any[] = ["case"];
        stats.forEach((row: EtymologyStat) => {
            if (row.color && row.subjects?.length) {
                data.push(
                    ["in", ["get", "wikidata", ["at", 0, ["get", "etymologies"]]], ["literal", row.subjects]],
                    row.color,
                    [
                        "all",
                        [">", ["length", ["get", "etymologies"]], 1],
                        ["in", ["get", "wikidata", ["at", 1, ["get", "etymologies"]]], ["literal", row.subjects]]
                    ],
                    row.color,
                );
            }
        });
        data.push('#223b53');
        this._setLayerColor(data as ExpressionSpecification);
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
