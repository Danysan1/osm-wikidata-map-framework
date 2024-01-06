import type { MapLibreEvent as MapEvent, MapSourceDataEvent, ExpressionSpecification } from 'maplibre-gl';

// import { MapboxEvent as MapEvent, MapSourceDataEvent, Expression as ExpressionSpecification } from 'mapbox-gl';

import { Chart, ArcElement, PieController, Tooltip, Legend, ChartData } from 'chart.js';
import { getCorrectFragmentParams, getFragmentParams } from '../fragment';
import { getConfig, getJsonConfig } from '../config';
import { ColorScheme, ColorSchemeID, colorSchemes } from '../model/colorScheme';
import { DropdownControl, DropdownItem } from './DropdownControl';
import type { TFunction } from 'i18next';
import type { Etymology } from '../model/Etymology';
import type { EtymologyFeatureProperties } from '../model/EtymologyFeatureProperties';
import { showLoadingSpinner } from '../snackbar';
import { WikidataStatsService, statsQueries } from '../services';

const MAX_CHART_ITEMS = 35;

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
    private lastWikidataIDs?: string[];
    private lastColorSchemeID?: ColorSchemeID;
    private lastBackEndID?: string;
    private lastFeatureCount?: number;
    private layerIDs: string[];
    private minZoomLevel: number;
    private osmTextOnlyLabel: string;
    private pictureAvailableLabel: string;
    private pictureUnavailableLabel: string;
    private statsService?: WikidataStatsService;
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
            () => this.value = getCorrectFragmentParams().colorScheme,
            (e: MapSourceDataEvent) => {
                if (e.isSourceLoaded && e.dataType === "source" && sourceId === e.sourceId)
                    this.updateChart(e);
            }
        );
        this.setLayerColor = setLayerColor;
        this.layerIDs = layerIDs;
        this.minZoomLevel = minZoomLevel;
        this.osmTextOnlyLabel = t("color_scheme.osm_text_only", "OSM (Text only)");
        this.pictureAvailableLabel = t("color_scheme.available", "Available");
        this.pictureUnavailableLabel = t("color_scheme.unavailable", "Unavailable");
    }

    public async updateChart(event?: MapEvent | Event) {
        const dropdown = this.getDropdown();
        if (!dropdown) {
            if (process.env.NODE_ENV === 'development') console.warn("updateChart: dropdown not yet initialized", { event });
            return;
        }

        const zoomLevel = this.getMap()?.getZoom();
        if (zoomLevel === undefined || zoomLevel < this.minZoomLevel) {
            if (process.env.NODE_ENV === 'development') console.debug("updateChart: skipping chart update ", { zoomLevel, minZoomLevel: this.minZoomLevel, event });
            this.showDropdown(false);
            return;
        }

        const colorSchemeID = dropdown.value as ColorSchemeID,
            colorScheme = colorSchemes[colorSchemeID];
        if (process.env.NODE_ENV === 'development') console.debug("updateChart: updating", { event, colorSchemeID, colorScheme });
        if (colorSchemeID === ColorSchemeID.feature_source) {
            this.loadFeatureSourceChartData();
            if (event)
                this.showDropdown();
        } else if (colorSchemeID === ColorSchemeID.etymology_source) {
            this.loadEtymologySourceChartData();
            if (event)
                this.showDropdown();
        } else if (colorSchemeID === ColorSchemeID.picture) {
            this.loadPictureAvailabilityChartData();
            if (event)
                this.showDropdown();
        } else if (colorSchemeID in statsQueries) {
            this.downloadChartDataFromWikidata(colorSchemeID);
            if (event)
                this.showDropdown();
        } else if (event?.type === 'change') {
            this.showDropdown(false);
            if (colorScheme?.color)
                this.setLayerColor(colorScheme.color);
        }
    }

    private areLayersAvailable() {
        for (const i in this.layerIDs) {
            if (!this.getMap()?.getLayer(this.layerIDs[i])) {
                if (process.env.NODE_ENV === 'development') console.warn("calculateAndLoadChartData: layer not yet loaded", { layers: this.layerIDs, layer: this.layerIDs[i] });
                return false;
            }
        }
        return true;
    }

    private calculateAndLoadChartData(
        colorSchemeID: ColorSchemeID,
        calculateChartData: (features: EtymologyFeatureProperties[]) => EtymologyStat[],
        layerColor: ExpressionSpecification
    ) {
        const colorSchemeIDChanged = this.lastColorSchemeID !== colorSchemeID,
            backEndID = getFragmentParams().backEndID || undefined,
            backEndChanged = this.lastBackEndID !== backEndID;

        const features: EtymologyFeatureProperties[] | undefined = this.getMap()
            ?.queryRenderedFeatures({ layers: this.layerIDs })
            ?.map(f => f.properties);
        if (process.env.NODE_ENV === 'development') console.debug("calculateAndLoadChartData", { colorSchemeID, colorSchemeIDChanged, layerColor, features });
        if (colorSchemeIDChanged || backEndChanged || features?.length !== this.lastFeatureCount) {
            this.lastColorSchemeID = colorSchemeID;
            this.lastBackEndID = backEndID;
            this.lastFeatureCount = features?.length;

            const stats = calculateChartData(features || []);
            this.setChartStats(stats);
        }

        if (colorSchemeIDChanged || backEndChanged) {
            if (process.env.NODE_ENV === 'development') console.debug("calculateAndLoadChartData: updating layer color", { colorSchemeIDChanged, backEndChanged, layerColor });
            this.setLayerColor(layerColor);
        } else {
            if (process.env.NODE_ENV === 'development') console.debug("calculateAndLoadChartData: skipping layer color update", { colorSchemeIDChanged, backEndChanged });
        }
    }

    private loadFeatureSourceChartData() {
        if (!this.areLayersAvailable())
            return;

        this.lastWikidataIDs = undefined;
        this.calculateAndLoadChartData(
            ColorSchemeID.feature_source,
            (features: EtymologyFeatureProperties[]) => {
                const osm_IDs = new Set<string>(),
                    osm_wikidata_IDs = new Set<string>(),
                    wikidata_IDs = new Set<string>();
                features.forEach((feature, i) => {
                    const id = feature?.wikidata || feature?.name?.toLowerCase() || i.toString();
                    if (feature?.from_osm && feature?.from_wikidata)
                        osm_wikidata_IDs.add(id);
                    else if (feature?.from_osm)
                        osm_IDs.add(id);
                    else if (feature?.from_wikidata)
                        wikidata_IDs.add(id);
                });
                const stats: EtymologyStat[] = [];
                if (osm_wikidata_IDs.size) stats.push({ name: "OSM + Wikidata", color: OSM_WIKIDATA_COLOR, id: 'osm_wikidata', count: osm_wikidata_IDs.size });
                if (wikidata_IDs.size) stats.push({ name: "Wikidata", color: WIKIDATA_COLOR, id: 'wikidata', count: wikidata_IDs.size });
                if (osm_IDs.size) stats.push({ name: "OpenStreetMap", color: OSM_COLOR, id: 'osm_wikidata', count: osm_IDs.size });
                if (process.env.NODE_ENV === 'development') console.debug("loadFeatureSourceChartData", { features: features, stats, osm_wikidata_IDs, wikidata_IDs, osm_IDs });
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
        if (!this.areLayersAvailable())
            return;

        this.lastWikidataIDs = undefined;
        this.calculateAndLoadChartData(
            ColorSchemeID.etymology_source,
            (features: EtymologyFeatureProperties[]) => {
                const osm_IDs = new Set<string>(),
                    osm_text_names = new Set<string>(),
                    osm_wikidata_IDs = new Set<string>(),
                    wikidata_IDs = new Set<string>(),
                    propagation_IDs = new Set<string>();
                features.forEach(feature => {
                    const rawEtymologies = feature?.etymologies,
                        etymologies = typeof rawEtymologies === 'string' ? JSON.parse(rawEtymologies) as Etymology[] : rawEtymologies;

                    if (etymologies?.some(ety => ety.wikidata)) {
                        etymologies.forEach(etymology => {
                            if (!etymology.wikidata) {
                                if (process.env.NODE_ENV === 'development') console.debug("Skipping etymology with no Wikidata ID in source calculation", etymology);
                            } else if (etymology.propagated) {
                                propagation_IDs.add(etymology.wikidata);
                            } else if (feature?.from_osm && etymology.from_wikidata) {
                                osm_wikidata_IDs.add(etymology.wikidata);
                            } else if (etymology.from_wikidata) {
                                wikidata_IDs.add(etymology.wikidata);
                            } else if (etymology.from_osm) {
                                osm_IDs.add(etymology.wikidata);
                            }
                        });
                    } else if (feature?.text_etymology) {
                        osm_text_names.add(feature?.text_etymology);
                    }
                });
                const stats: EtymologyStat[] = [];
                if (propagation_IDs.size) stats.push({ name: "Propagation", color: PROPAGATED_COLOR, id: 'propagation', count: propagation_IDs.size });
                if (osm_wikidata_IDs.size) stats.push({ name: "OSM + Wikidata", color: OSM_WIKIDATA_COLOR, id: 'osm_wikidata', count: osm_wikidata_IDs.size });
                if (wikidata_IDs.size) stats.push({ name: "Wikidata", color: WIKIDATA_COLOR, id: 'wikidata', count: wikidata_IDs.size });
                if (osm_IDs.size) stats.push({ name: "OpenStreetMap", color: OSM_COLOR, id: 'osm_wikidata', count: osm_IDs.size });
                if (osm_text_names.size) stats.push({ name: this.osmTextOnlyLabel, color: FALLBACK_COLOR, id: "osm_text", count: osm_text_names.size });
                if (process.env.NODE_ENV === 'development') console.debug("loadEtymologySourceChartData", { features, stats, propagation_IDs, osm_wikidata_IDs, wikidata_IDs, osm_IDs, osm_text_names });
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

    private async loadPictureAvailabilityChartData() {
        if (!this.areLayersAvailable())
            return;

        showLoadingSpinner(true);
        let propertiesList: EtymologyFeatureProperties[] | undefined;
        try {
            propertiesList = this.getMap()
                ?.queryRenderedFeatures({ layers: this.layerIDs })
                ?.map(feature => feature.properties);
        } catch (error) {
            if (process.env.NODE_ENV === 'development') console.error("Error querying rendered features", {
                colorSchemeID: ColorSchemeID.picture, layers: this.layerIDs, error
            });
            return;
        }

        const with_picture_IDs = new Set<string | number>(),
            unknown_picture_IDs = new Set<string>(),
            without_picture_IDs = new Set<string | number>();
        propertiesList?.forEach(props => {
            const id = props.wikidata || props.osm_type + '/' + props.osm_id;
            if (props.picture || props.commons)
                with_picture_IDs.add(id);
            else if (props.wikidata)
                unknown_picture_IDs.add(props.wikidata);
            else
                without_picture_IDs.add(id);
        });
        const stats = await this.downloadChartDataForWikidataIDs(unknown_picture_IDs, ColorSchemeID.picture) || [],
            withPictureObject = stats.find(stat => stat.id === 'available'),
            withoutPictureObject = stats.find(stat => stat.id === 'unavailable');
        if (withPictureObject) {
            withPictureObject.name = this.pictureAvailableLabel;
            withPictureObject.color = HAS_PICTURE_COLOR;
            withPictureObject.count += with_picture_IDs.size;
        } else {
            stats.push({
                name: this.pictureAvailableLabel, color: HAS_PICTURE_COLOR, count: with_picture_IDs.size, id: 'available'
            });
        }
        if (withoutPictureObject) {
            withoutPictureObject.name = this.pictureUnavailableLabel;
            withoutPictureObject.color = NO_PICTURE_COLOR;
            withoutPictureObject.count += without_picture_IDs.size;
        } else {
            stats.push({
                name: this.pictureUnavailableLabel, color: NO_PICTURE_COLOR, count: without_picture_IDs.size, id: 'unavailable'
            });
        }

        this.setChartStats(stats)

        const statsData: Array<ExpressionSpecification | string> = []
        stats.forEach((row: EtymologyStat) => {
            const color = row.color;
            if (color && row.subjects?.length) {
                row.subjects.forEach(subject => {
                    statsData.push(["==", subject, ["get", "wikidata"]], color);
                });
            } else {
                if (process.env.NODE_ENV === 'development') console.debug("loadPictureAvailabilityChartData: skipping row with no color or subjects", { row });
            }
        });

        const data: ExpressionSpecification = [
            "case",
            ["has", "picture"], HAS_PICTURE_COLOR,
            ["has", "commons"], HAS_PICTURE_COLOR,
            ["!", ["has", "wikidata"]], NO_PICTURE_COLOR,
            ...statsData,
            NO_PICTURE_COLOR
        ];
        if (process.env.NODE_ENV === 'development') console.debug("loadPictureAvailabilityChartData: setting layer color", data);
        this.setLayerColor(data);

        showLoadingSpinner(false);
    }

    private async downloadChartDataFromWikidata(colorSchemeID: ColorSchemeID) {
        if (!this.areLayersAvailable())
            return;

        showLoadingSpinner(true);
        let wikidataIDs: string[] = [];
        try {
            wikidataIDs = this.getMap()
                ?.queryRenderedFeatures({ layers: this.layerIDs })
                ?.map(feature => feature.properties?.etymologies)
                ?.flatMap(etymologies => {
                    if (Array.isArray(etymologies))
                        return etymologies as Etymology[];

                    if (typeof etymologies === 'string')
                        return JSON.parse(etymologies) as Etymology[];

                    return [];
                })
                ?.map(etymology => etymology.wikidata)
                ?.filter(id => typeof id === 'string') as string[] || [];
        } catch (error) {
            if (process.env.NODE_ENV === 'development') console.error("Error querying rendered features", {
                colorSchemeID, layers: this.layerIDs, error
            });
            return;
        }

        const idSet = new Set(wikidataIDs), // de-duplicate
            stats = await this.downloadChartDataForWikidataIDs(idSet, colorSchemeID);
        if (stats?.length) {
            this.setChartStats(stats)
            this.setLayerColorForStats(stats);
        } else {
            this.removeChart();
        }

        showLoadingSpinner(false);
    }

    private async downloadChartDataForWikidataIDs(idSet: Set<string>, colorSchemeID: ColorSchemeID): Promise<EtymologyStat[] | null> {
        if (idSet.size === 0) {
            if (process.env.NODE_ENV === 'development') console.debug("downloadChartDataForWikidataIDs: Skipping stats update for 0 IDs");
            return null;
        }

        if (colorSchemeID === this.lastColorSchemeID && this.lastWikidataIDs?.length === idSet.size && this.lastWikidataIDs?.every(id => id in idSet)) {
            if (process.env.NODE_ENV === 'development') console.debug("downloadChartDataForWikidataIDs: Skipping stats update for already downloaded IDs", { colorSchemeID, lastColorSchemeID: this.lastColorSchemeID, idSet, lastWikidataIDs: this.lastWikidataIDs });
            return null;
        }

        const uniqueIDs = Array.from(idSet),
            backEndID = getFragmentParams().backEndID || undefined;
        if (process.env.NODE_ENV === 'development') console.debug("downloadChartDataForWikidataIDs: Updating stats", { colorSchemeID, uniqueIDs, backEndID });
        this.lastColorSchemeID = colorSchemeID;
        this.lastWikidataIDs = uniqueIDs;
        this.lastBackEndID = backEndID;
        try {
            if (!this.statsService)
                this.statsService = new WikidataStatsService();
            const stats = await this.statsService.fetchStats(uniqueIDs, colorSchemeID);

            if (!stats.length) {
                if (process.env.NODE_ENV === 'development') console.debug("downloadChartDataForWikidataIDs: empty stats received", { colorSchemeID, uniqueIDs });
                return null;
            } else if (colorSchemeID != this.lastColorSchemeID) {
                if (process.env.NODE_ENV === 'development') console.debug("downloadChartDataForWikidataIDs: color scheme has changed while fetching stats", { colorSchemeID, newColorSchemeID: this.lastColorSchemeID, uniqueIDs });
                return null;
            } else {
                return stats;
            }
        } catch (e) {
            console.error("Stats fetch error", e);
            this.lastWikidataIDs = undefined;
            return null;
        }
    }

    private setLayerColorForStats(stats: EtymologyStat[]) {
        const statsData: Array<ExpressionSpecification | string> = [];
        stats.forEach((row: EtymologyStat) => {
            const color = row.color;
            if (color && row.subjects?.length) {
                // In vector tiles etymologies array is JSON-encoded
                // In GeoJSON the map library leaves the etymologies array as an array of objects
                // "to-string" converts either way to string in order to check whether it contains the subject
                row.subjects.forEach(subject => {
                    statsData.push(["in", subject + '"', ["to-string", ["get", "etymologies"]]], color);
                });
            } else {
                if (process.env.NODE_ENV === 'development') console.debug("setLayerColorForStats: skipping row with no color or subjects", { row });
            }
        });

        const data: ExpressionSpecification = [
            "case",
            ["!", ["has", "etymologies"]], FALLBACK_COLOR,
            ["==", ["length", ["get", "etymologies"]], 0], FALLBACK_COLOR,
            ["==", ["get", "etymologies"], "[]"], FALLBACK_COLOR,
            ...statsData,
            FALLBACK_COLOR
        ];

        if (process.env.NODE_ENV === 'development') console.debug("setLayerColorForStats: setting layer color", { stats, data });
        this.setLayerColor(data);
    }

    /**
     * Initializes or updates the chart with the given statistics
     * 
     * @see https://www.chartjs.org/docs/latest/general/data-structures.html
     */
    private setChartStats(stats: EtymologyStat[]) {
        if (this._chartInitInProgress) {
            if (process.env.NODE_ENV === 'development') console.debug("setChartData: chart already loading");
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

        if (process.env.NODE_ENV === 'development') console.debug("setChartData", {
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

        if (process.env.NODE_ENV === 'development') console.debug("initChartObject: Initializing the chart");

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
            if (process.env.NODE_ENV === 'development') console.warn("setChartData: chart table body not found");
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
