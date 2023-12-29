import { MapLibreEvent as MapEvent, MapSourceDataEvent, ExpressionSpecification, MapGeoJSONFeature } from 'maplibre-gl';

// import { MapboxEvent as MapEvent, MapSourceDataEvent, Expression as ExpressionSpecification, MapGeoJSONFeature } from 'mapbox-gl';

import { Chart, ArcElement, PieController, Tooltip, Legend, ChartData } from 'chart.js';
import { getCorrectFragmentParams } from '../fragment';
import { debug, getConfig, getJsonConfig } from '../config';
import { ColorScheme, ColorSchemeID, colorSchemes } from '../model/colorScheme';
import { DropdownControl, DropdownItem } from './DropdownControl';
import type { TFunction } from 'i18next';
import type { Etymology } from '../model/Etymology';
import type { EtymologyFeature } from '../model/EtymologyResponse';
import { showLoadingSpinner } from '../snackbar';
import { WikidataStatsService, statsQueries } from '../services';

const MAX_CHART_ITEMS = 30;

/** Statistics row with a name and a numeric value */
export interface EtymologyStat {
    /** Human friendly name of this statistic */
    name: string;

    /** Numeric value of this statistic */
    count: number;

    /** Hex color code for this statistic, including the trailing hashtag */
    color?: string;

    /** Q-ID of the Wikidata entity of this statistic */
    id?: string;

    /** Q-ID of a Wikidata superclass of the entity of this statistic */
    class?: string;

    /** Q-IDs of the Wikidata entities this statistic represents */
    subjects?: string[];
}

const PROPAGATED_COLOR = '#ff3333',
    OSM_WIKIDATA_COLOR = '#33ffee',
    WIKIDATA_COLOR = '#3399ff',
    OSM_COLOR = '#33ff66',
    FALLBACK_COLOR = '#000000',
    HAS_PICTURE_COLOR = '#33ff66',
    NO_PICTURE_COLOR = '#ff3333';

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
    private _chartJsObject?: Chart;
    private _lastWikidataIDs?: string[];
    private _lastColorSchemeID?: ColorSchemeID;
    private lastFeatureCount?: number;
    private layerIDs: string[];
    private osmTextOnly: string;
    private pictureAvailable: string;
    private pictureUnavailable: string;
    private setLayerColor: (color: string | ExpressionSpecification) => void;

    constructor(
        startColorScheme: ColorSchemeID,
        onSchemeChange: (colorScheme: ColorSchemeID) => void,
        setLayerColor: (color: string | ExpressionSpecification) => void,
        t: TFunction,
        sourceId: string,
        layerIDs: string[],
        minZoomLevel: number
    ) {
        const keys: string[] | null = getJsonConfig("osm_wikidata_keys"),
            wdDirectProperties: string[] | null = getJsonConfig("osm_wikidata_properties"),
            indirectWdProperty = getConfig("wikidata_indirect_property"),
            anyEtymology = keys?.length || wdDirectProperties?.length || indirectWdProperty,
            entries = Object.entries(colorSchemes),
            usableColorSchemes = anyEtymology ? entries : entries.filter(([, scheme]) => scheme.showWithoutEtymology),
            dropdownItems: DropdownItem[] = usableColorSchemes.map(([id, item]) => ({
                id,
                text: t(item.textKey, item.defaultText),
                category: t(item.categoryKey, item.defaultCategoryText),
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
                if (!e.isSourceLoaded || e.dataType !== "source" || sourceId !== e.sourceId)
                    return;

                const zoomLevel = e.target.getZoom(),
                    validZoomLevel = zoomLevel >= minZoomLevel;
                if (validZoomLevel) {
                    if (debug) console.debug("EtymologyColorControl: updating chart ", { zoomLevel, minZoomLevel, validZoomLevel, sourceId, e });
                    this.updateChart(e);
                } else {
                    if (debug) console.debug("EtymologyColorControl: skipping chart update ", { zoomLevel, minZoomLevel, validZoomLevel, sourceId, e });
                }
            }
        );
        this.setLayerColor = setLayerColor;
        this.layerIDs = layerIDs;
        this.osmTextOnly = t("color_scheme.osm_text_only", "OSM (Text only)");
        this.pictureAvailable = t("color_scheme.available", "Available");
        this.pictureUnavailable = t("color_scheme.unavailable", "Unavailable");
    }

    public async updateChart(event?: MapEvent | Event) {
        const dropdown = this.getDropdown();
        if (!dropdown) {
            console.error("updateChart: dropdown not yet initialized", { event });
            return;
        } else {
            const colorSchemeID = dropdown.value as ColorSchemeID,
                colorScheme = colorSchemes[colorSchemeID];

            if (colorSchemeID === 'feature_source') {
                if (debug) console.debug("updateChart: showing feature source stats", { event, colorSchemeID });
                this.loadFeatureSourceChartData();
                if (event)
                    this.showDropdown();
            } else if (colorSchemeID === 'etymology_source') {
                if (debug) console.debug("updateChart: showing etymology source stats", { event, colorSchemeID });
                this.loadEtymologySourceChartData();
                if (event)
                    this.showDropdown();
            } else if (colorSchemeID === 'picture') {
                if (debug) console.debug("updateChart: showing picture stats", { event, colorSchemeID });
                this.loadPictureAvailabilityChartData();
                if (event)
                    this.showDropdown();
            } else if (colorSchemeID in statsQueries) {
                if (debug) console.debug("updateChart: downloading stats from Wikidata", { event, colorSchemeID });
                this.downloadChartDataFromWikidata(colorSchemeID);
                if (event)
                    this.showDropdown();
            } else if (event?.type === 'change') {
                if (debug) console.debug("updateChart: change event with no query nor urlCode, hiding", { event, colorSchemeID });
                this.showDropdown(false);
                if (colorScheme?.color)
                    this.setLayerColor(colorScheme.color);
            }
        }
    }

    private calculateAndLoadChartData(
        colorSchemeID: ColorSchemeID,
        calculateChartData: (features: EtymologyFeature[]) => EtymologyStat[],
        layerColor: ExpressionSpecification
    ) {
        const colorSchemeIDChanged = this._lastColorSchemeID !== colorSchemeID;
        this._lastColorSchemeID = colorSchemeID;

        for (const i in this.layerIDs) {
            if (!this.getMap()?.getLayer(this.layerIDs[i])) {
                if (debug) console.warn("loadSourceChartData: layer not yet loaded", { layers: this.layerIDs, layer: this.layerIDs[i] });
                return;
            }
        }

        const features = this.getMap()?.queryRenderedFeatures({ layers: this.layerIDs });
        if (colorSchemeIDChanged || features?.length !== this.lastFeatureCount) {
            this.lastFeatureCount = features?.length;

            const stats = calculateChartData(features || []);
            if (debug) console.debug("calculateAndLoadChartData", { etymologies: features?.map(f => f.properties?.etymologies), stats, layerColor });
            this.setChartStats(stats);
        }

        if (colorSchemeID)
            this.setLayerColor(layerColor);
    }

    private loadFeatureSourceChartData() {
        this._lastWikidataIDs = undefined;
        this.calculateAndLoadChartData(
            ColorSchemeID.feature_source,
            (features: EtymologyFeature[]) => {
                const osm_IDs = new Set<string>(),
                    osm_wikidata_IDs = new Set<string>(),
                    wikidata_IDs = new Set<string>();
                features.forEach((feature: EtymologyFeature, i) => {
                    const id = feature.properties?.wikidata || feature.properties?.name?.toLowerCase() || feature.id?.toString() || i.toString();
                    if (feature.properties?.from_osm && feature.properties?.from_wikidata)
                        osm_wikidata_IDs.add(id);
                    else if (feature.properties?.from_osm)
                        osm_IDs.add(id);
                    else if (feature.properties?.from_wikidata)
                        wikidata_IDs.add(id);
                });
                const stats: EtymologyStat[] = [];
                if (osm_wikidata_IDs.size) stats.push({ name: "OSM + Wikidata", color: OSM_WIKIDATA_COLOR, id: 'osm_wikidata', count: osm_wikidata_IDs.size });
                if (wikidata_IDs.size) stats.push({ name: "Wikidata", color: WIKIDATA_COLOR, id: 'wikidata', count: wikidata_IDs.size });
                if (osm_IDs.size) stats.push({ name: "OpenStreetMap", color: OSM_COLOR, id: 'osm_wikidata', count: osm_IDs.size });
                if (debug) console.debug("loadFeatureSourceChartData", { features, stats, osm_wikidata_IDs, wikidata_IDs, osm_IDs });
                return stats;
            },
            [
                "case",
                ["coalesce", ["all",
                    ["to-boolean", ["get", "from_osm"]],
                    ["to-boolean", ["get", "from_wikidata"]]
                ], false], OSM_WIKIDATA_COLOR,
                ["coalesce", ["to-boolean", ["get", "from_osm"]], false], OSM_COLOR,
                ["coalesce", ["to-boolean", ["get", "from_wikidata"]], false], WIKIDATA_COLOR,
                FALLBACK_COLOR
            ]
        );
    }

    private loadEtymologySourceChartData() {
        this._lastWikidataIDs = undefined;
        this.calculateAndLoadChartData(
            ColorSchemeID.etymology_source,
            (features: EtymologyFeature[]) => {
                const osm_IDs = new Set<string>(),
                    osm_text_names = new Set<string>(),
                    osm_wikidata_IDs = new Set<string>(),
                    wikidata_IDs = new Set<string>(),
                    propagation_IDs = new Set<string>();
                features.forEach((feature: EtymologyFeature) => {
                    const rawEtymologies = feature.properties?.etymologies,
                        etymologies = typeof rawEtymologies === 'string' ? JSON.parse(rawEtymologies) as Etymology[] : rawEtymologies;

                    if (etymologies?.some(ety => ety.wikidata)) {
                        etymologies.forEach(etymology => {
                            if (!etymology.wikidata) {
                                if (debug) console.debug("Skipping etymology with no Wikidata ID in source calculation", etymology);
                            } else if (etymology.propagated) {
                                propagation_IDs.add(etymology.wikidata);
                            } else if (feature.properties?.from_osm && etymology.from_wikidata) {
                                osm_wikidata_IDs.add(etymology.wikidata);
                            } else if (etymology.from_wikidata) {
                                wikidata_IDs.add(etymology.wikidata);
                            } else if (etymology.from_osm) {
                                osm_IDs.add(etymology.wikidata);
                            }
                        });
                    } else if (feature.properties?.text_etymology) {
                        osm_text_names.add(feature.properties?.text_etymology);
                    }
                });
                const stats: EtymologyStat[] = [];
                if (propagation_IDs.size) stats.push({ name: "Propagation", color: PROPAGATED_COLOR, id: 'propagation', count: propagation_IDs.size });
                if (osm_wikidata_IDs.size) stats.push({ name: "OSM + Wikidata", color: OSM_WIKIDATA_COLOR, id: 'osm_wikidata', count: osm_wikidata_IDs.size });
                if (wikidata_IDs.size) stats.push({ name: "Wikidata", color: WIKIDATA_COLOR, id: 'wikidata', count: wikidata_IDs.size });
                if (osm_IDs.size) stats.push({ name: "OpenStreetMap", color: OSM_COLOR, id: 'osm_wikidata', count: osm_IDs.size });
                if (osm_text_names.size) stats.push({ name: this.osmTextOnly, color: FALLBACK_COLOR, id: "osm_text", count: osm_text_names.size });
                if (debug) console.debug("loadEtymologySourceChartData", { features, stats, propagation_IDs, osm_wikidata_IDs, wikidata_IDs, osm_IDs, osm_text_names });
                return stats;
            },
            [
                "case",
                ["!", ["has", "etymologies"]], FALLBACK_COLOR,
                ["==", ["length", ["get", "etymologies"]], 0], FALLBACK_COLOR,
                ["==", ["get", "etymologies"], "[]"], FALLBACK_COLOR,

                // Checks for vector tiles and PMTiles (where the etymologies array is JSON-encoded with spaces)
                ["coalesce", ["in", '"propagated" : true', ["get", "etymologies"]], false], PROPAGATED_COLOR,
                ["coalesce", ["all",
                    ["to-boolean", ["get", "from_osm"]],
                    ["in", '"from_wikidata" : true', ["get", "etymologies"]],
                ], false], OSM_WIKIDATA_COLOR,
                ["coalesce", ["in", '"from_wikidata" : true', ["get", "etymologies"]], false], WIKIDATA_COLOR,
                ["coalesce", ["in", '"from_osm" : true', ["get", "etymologies"]], false], OSM_COLOR,

                // Checks for cases where the map library JSON-encodes the etymologies array without spaces
                ["coalesce", ["in", '"propagated":true', ["to-string", ["get", "etymologies"]]], false], PROPAGATED_COLOR,
                ["coalesce", ["all",
                    ["to-boolean", ["get", "from_osm"]],
                    ["in", '"from_wikidata":true', ["to-string", ["get", "etymologies"]]],
                ], false], OSM_WIKIDATA_COLOR,
                ["coalesce", ["in", '"from_wikidata":true', ["to-string", ["get", "etymologies"]]], false], WIKIDATA_COLOR,
                ["coalesce", ["in", '"from_osm":true', ["to-string", ["get", "etymologies"]]], false], OSM_COLOR,

                FALLBACK_COLOR
            ]
        );
    }

    private loadPictureAvailabilityChartData() {
        this._lastWikidataIDs = undefined;
        this.calculateAndLoadChartData(
            ColorSchemeID.picture,
            (features: EtymologyFeature[]) => {
                const with_picture_IDs = new Set<string | number>(),
                    without_picture_IDs = new Set<string | number>();
                features.forEach((feature: EtymologyFeature) => {
                    const id = feature.id || feature.properties?.wikidata || feature.properties?.osm_type + '/' + feature.properties?.osm_id;
                    if (feature.properties?.picture || feature.properties?.commons)
                        with_picture_IDs.add(id);
                    else
                        without_picture_IDs.add(id);
                });
                const stats: EtymologyStat[] = [];
                if (without_picture_IDs.size) stats.push({ name: this.pictureUnavailable, color: NO_PICTURE_COLOR, count: without_picture_IDs.size, id: 'unavailable' });
                if (with_picture_IDs.size) stats.push({ name: this.pictureAvailable, color: HAS_PICTURE_COLOR, count: with_picture_IDs.size, id: 'available' });
                return stats;
            },
            [
                "case",
                ["any", ["has", "picture"], ["has", "commons"]], HAS_PICTURE_COLOR,
                NO_PICTURE_COLOR
            ]
        );
    }

    private async downloadChartDataFromWikidata(colorSchemeID: ColorSchemeID) {
        showLoadingSpinner(true);
        let features: MapGeoJSONFeature[] | undefined;
        try {
            features = this.getMap()?.queryRenderedFeatures({ layers: this.layerIDs });
        } catch (error) {
            if (debug) console.error("Error querying rendered features", {
                colorSchemeID, layers: this.layerIDs, error
            });
            return;
        }

        const wikidataIDs = features
            ?.map(feature => feature.properties?.etymologies)
            ?.flatMap(etymologies => {
                if (Array.isArray(etymologies))
                    return etymologies as Etymology[];

                if (typeof etymologies === 'string')
                    return JSON.parse(etymologies) as Etymology[];

                return [];
            })
            ?.map(etymology => etymology.wikidata)
            ?.filter(id => typeof id === 'string') as string[] || [],
            idSet = new Set(wikidataIDs); // de-duplicate
        if (idSet.size === 0) {
            if (debug) console.debug("Skipping stats update for 0 IDs");
        } else if (colorSchemeID === this._lastColorSchemeID && this._lastWikidataIDs?.length === idSet.size && this._lastWikidataIDs?.every(id => id in idSet)) {
            if (debug) console.debug("Skipping stats update for already downloaded IDs", { colorSchemeID, lastColorSchemeID: this._lastColorSchemeID, idSet, lastWikidataIDs: this._lastWikidataIDs });
        } else {
            const uniqueIDs = Array.from(idSet);
            if (debug) console.debug("Updating stats", { colorSchemeID, lastColorSchemeID: this._lastColorSchemeID, uniqueIDs, lastWikidataIDs: this._lastWikidataIDs });
            this._lastColorSchemeID = colorSchemeID;
            this._lastWikidataIDs = uniqueIDs;
            try {
                const statsService = new WikidataStatsService(),
                    stats = await statsService.fetchStats(uniqueIDs, colorSchemeID);
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
        showLoadingSpinner(false);
    }

    private setLayerColorForStats(stats: EtymologyStat[]) {
        const data: ExpressionSpecification = [
            "case",
            ["!", ["has", "etymologies"]], FALLBACK_COLOR,
            ["==", ["length", ["get", "etymologies"]], 0], FALLBACK_COLOR,
            ["==", ["get", "etymologies"], "[]"], FALLBACK_COLOR,
        ];

        stats.forEach((row: EtymologyStat) => {
            const color = row.color;
            if (color && row.subjects?.length) {
                // In vector tiles etymologies array is JSON-encoded
                // In GeoJSON the map library leaves the etymologies array as an array of objects
                // "to-string" converts either way to string in order to check whether it contains the subject
                row.subjects.forEach(subject => {
                    data.push(["in", subject, ["to-string", ["get", "etymologies"]]], color);
                });
            } else {
                if (debug) console.debug("setLayerColorForStats: skipping row with no color or subjects", { row });
            }
        });

        data.push(FALLBACK_COLOR);

        if (debug) console.debug("setLayerColorForStats", { stats, data });
        this.setLayerColor(data);
    }

    /**
     * Initializes or updates the chart with the given statistics
     * 
     * @see https://www.chartjs.org/docs/latest/general/data-structures.html
     */
    private setChartStats(stats: EtymologyStat[]) {
        if (this._chartInitInProgress) {
            if (debug) console.debug("setChartData: chart already loading");
            return;
        }

        const data: ChartData<"pie"> = {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
            }]
        };
        stats.slice(0, MAX_CHART_ITEMS).forEach((row: EtymologyStat) => {
            data.labels?.push(row.name);
            (data.datasets[0].backgroundColor as string[]).push(row.color || FALLBACK_COLOR);
            data.datasets[0].data.push(row.count);
        });

        if (debug) console.debug("setChartData", {
            stats,
            chartDomElement: this._chartDomElement,
            chartJsObject: this._chartJsObject,
            data
        });

        if (this._chartJsObject && this._chartDomElement) {
            this.updateChartObject(data);
        } else {
            this.initChartObject(data);
        }

        this.updateChartTable(data);
    }

    /**
     * Initializes the chart with the given data
     * 
     * @see https://www.chartjs.org/docs/latest/getting-started/integration.html#bundlers-webpack-rollup-etc
     * @see https://www.chartjs.org/docs/latest/charts/doughnut.html#pie
     * @see https://www.chartjs.org/docs/latest/general/accessibility.html
     */
    private async initChartObject(data: ChartData<"pie">) {
        if (this._chartJsObject)
            throw new Error("initChartObject: chart already initialized");
        if (this._chartInitInProgress)
            throw new Error("initChartObject: chart initialization already in progress");

        const container = this.getContainer();
        if (!container)
            throw new Error("Missing container");

        if (debug) console.debug("initChartObject: Initializing the chart");

        this._chartInitInProgress = true

        this._chartDomElement = document.createElement('canvas');
        this._chartDomElement.className = 'chart';
        this._chartDomElement.ariaLabel = 'Statistics chart';
        this._chartDomElement.width = 300;
        this._chartDomElement.height = 300;
        container.appendChild(this._chartDomElement);

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

        const table = document.createElement('table');
        table.className = 'chart-fallback-table';
        table.ariaLabel = "Statistics table";
        this._chartDomElement.appendChild(table);

        const thead = document.createElement('thead'),
            tr_head = document.createElement('tr'),
            th_name = document.createElement('th'),
            th_count = document.createElement('th');
        table.appendChild(thead);
        thead.appendChild(tr_head);
        th_name.innerText = 'Name';
        tr_head.appendChild(th_name);
        th_count.innerText = 'Count';
        tr_head.appendChild(th_count);

        const tbody = document.createElement('tbody');
        tbody.className = 'chart-table-body';
        table.appendChild(tbody);

        this._chartInitInProgress = false;
    }

    /**
     * Updates the (already initialized) chart.js chart with the given data
     * 
     * @see https://www.chartjs.org/docs/latest/developers/updates.html
     */
    private updateChartObject(data: ChartData<"pie">) {
        if (!this._chartJsObject)
            throw new Error("updateChartObject: chart not yet initialized");

        this._chartJsObject.data.datasets[0].backgroundColor = data.datasets[0].backgroundColor;
        this._chartJsObject.data.labels = data.labels;
        this._chartJsObject.data.datasets[0].data = data.datasets[0].data;
        this._chartJsObject.update();
    }

    private updateChartTable(data: ChartData<"pie">) {
        const chartTableBody = document.querySelector('.chart-table-body');
        if (!chartTableBody) {
            if (debug) console.warn("setChartData: chart table body not found");
            return;
        }
        chartTableBody.innerHTML = '';
        data.labels?.forEach((label, i) => {
            const tr = document.createElement('tr'),
                td_name = document.createElement('td'),
                td_count = document.createElement('td');
            chartTableBody.appendChild(tr);
            td_name.innerText = label as string;
            tr.appendChild(td_name);
            td_count.innerText = data.datasets[0].data[i].toString();
            tr.appendChild(td_count);
        });
    }

    private removeChart() {
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
