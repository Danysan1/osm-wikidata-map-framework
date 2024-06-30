import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import type { Etymology } from "@/src/model/Etymology";
import type { EtymologyFeatureProperties } from "@/src/model/EtymologyFeatureProperties";
import type { EtymologyStat } from "@/src/model/EtymologyStat";
import type { SourcePreset } from "@/src/model/SourcePreset";
import { ColorScheme, ColorSchemeID, colorSchemes } from "@/src/model/colorScheme";
import { WikidataStatsService } from "@/src/services/WikidataStatsService";
import { getEtymologies } from "@/src/services/etymologyUtils";
import { ArcElement, ChartData, Chart as ChartJS, Legend, Tooltip } from "chart.js";
import type { ControlPosition, DataDrivenPropertyValueSpecification, ExpressionSpecification } from "maplibre-gl";
import { useTranslation } from "next-i18next";
import { FC, useEffect, useMemo, useState } from "react";
import { Pie } from 'react-chartjs-2';
import { useMap } from "react-map-gl/maplibre";
import { DropdownControl, DropdownItem } from "./DropdownControl";

ChartJS.register(ArcElement, Tooltip, Legend);

const MAX_CHART_ITEMS = 35,
    PROPAGATED_COLOR = '#ff3333',
    OSM_WIKIDATA_COLOR = '#33ffee',
    WIKIDATA_COLOR = '#3399ff',
    OSM_COLOR = '#33ff66',
    FALLBACK_COLOR = '#3bb2d0',
    HAS_PICTURE_COLOR = '#33ff66',
    NO_PICTURE_COLOR = '#ff3333',
    BLUE = '#3bb2d0',
    RED = '#e55e5e',
    ORANGE = '#fbb03b',
    BLACK = '#223b53',
    FEATURE_SOURCE_LAYER_COLOR: ExpressionSpecification = [
        "case",
        ["coalesce", ["all",
            ["to-boolean", ["get", "from_osm"]],
            ["to-boolean", ["get", "from_wikidata"]]
        ], false], OSM_WIKIDATA_COLOR,
        ["coalesce", ["to-boolean", ["get", "from_osm"]], false], OSM_COLOR,
        ["coalesce", ["to-boolean", ["get", "from_wikidata"]], false], WIKIDATA_COLOR,
        FALLBACK_COLOR
    ],
    ETYMOLOGY_SOURCE_LAYER_COLOR: ExpressionSpecification = [
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
    ];

interface StatisticsColorControlProps {
    preset: SourcePreset,
    sourceId: string,
    position?: ControlPosition;
    layerIDs: string[];
    setLayerColor: (color: DataDrivenPropertyValueSpecification<string>) => void;
}

type StatisticsCalculator = (features: EtymologyFeatureProperties[]) => Promise<readonly [EtymologyStat[] | null, ExpressionSpecification | null]>;

/**
 * Let the user choose a color scheme for the map data and see statistics about the data
 **/
export const StatisticsColorControl: FC<StatisticsColorControlProps> = (props) => {
    const { t } = useTranslation(),
        { current: map } = useMap(),
        { lat, lon, zoom } = useUrlFragmentContext(),
        { colorSchemeID, setColorSchemeID } = useUrlFragmentContext(),
        [chartData, setChartData] = useState<ChartData<"pie">>(),
        handlers: Record<ColorSchemeID, () => void> = useMemo(() => {
            const setFixedColor = (color: string) => {
                props.setLayerColor(color);
                setChartData(undefined);
            };
            const setChartStats = (stats: EtymologyStat[]) => {
                const usedStats = stats.slice(0, MAX_CHART_ITEMS);
                setChartData({
                    labels: usedStats.map(row => row.name),
                    datasets: [{
                        data: usedStats.map(row => row.count),
                        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                        backgroundColor: usedStats.map(row => row.color || FALLBACK_COLOR),
                    }]
                });
            }
            const calculateLocalChartData = async (calculateChartData: StatisticsCalculator) => {
                const features: EtymologyFeatureProperties[] | undefined = map?.queryRenderedFeatures({ layers: props.layerIDs })?.map(f => f.properties);
                const [stats, color] = await calculateChartData(features ?? []);
                if (process.env.NODE_ENV === 'development') console.debug("calculateAndLoadChartData: updating chart", { features, stats, color });
                if (color) props.setLayerColor(color);
                if (stats) setChartStats(stats);
            }

            const setLayerColorForStats = (stats: EtymologyStat[]) => {
                const statsData: (ExpressionSpecification | string)[] = [];
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
                props.setLayerColor(data);
            }
            /**
             * Downloads the statistics from Wikidata and loads it into the chart
             */
            const downloadChartDataFromWikidata = async (colorSchemeID: ColorSchemeID) => {
                let wikidataIDs: string[] = [];
                try {
                    wikidataIDs = map
                        ?.queryRenderedFeatures({ layers: props.layerIDs })
                        ?.flatMap(f => getEtymologies(f) ?? [])
                        ?.filter(etymology => etymology.wikidata)
                        ?.map(etymology => etymology.wikidata!) ?? [];
                } catch (error) {
                    if (process.env.NODE_ENV === 'development') console.error("Error querying rendered features", {
                        colorSchemeID, layers: props.layerIDs, error
                    });
                    return;
                }

                const idSet = new Set(wikidataIDs), // de-duplicate
                    stats = await downloadChartDataForWikidataIDs(idSet, colorSchemeID);
                if (stats?.length) {
                    setChartStats(stats)
                    setLayerColorForStats(stats);
                } else if (stats?.length === 0) {
                    setChartData(undefined);
                }
            }

            return {
                black: () => setFixedColor(BLACK),
                blue: () => setFixedColor(BLUE),
                country: () => void downloadChartDataFromWikidata(ColorSchemeID.country),
                endCentury: () => void downloadChartDataFromWikidata(ColorSchemeID.endCentury),
                etymology_link_count: () => downloadChartDataFromWikidata(ColorSchemeID.etymology_link_count),
                etymology_source: () => void calculateLocalChartData(calculateEtymologySourceStats(t("color_scheme.osm_text_only"))),
                feature_link_count: () => void calculateLocalChartData(loadWikilinkChartData),
                feature_source: () => void calculateLocalChartData(calculateFeatureSourceStats),
                gender: () => void downloadChartDataFromWikidata(ColorSchemeID.gender),
                occupation: () => void downloadChartDataFromWikidata(ColorSchemeID.occupation),
                orange: () => setFixedColor(ORANGE),
                picture: () => void calculateLocalChartData(loadPictureAvailabilityChartData(t("color_scheme.available"), t("color_scheme.unavailable"))),
                red: () => setFixedColor(RED),
                startCentury: () => void downloadChartDataFromWikidata(ColorSchemeID.startCentury),
                type: () => void downloadChartDataFromWikidata(ColorSchemeID.type),
            };
        }, [map, props, t]);

    const dropdownItems = useMemo((): DropdownItem[] => {
        const keys = props.preset.osm_wikidata_keys,
            wdDirectProperties = props.preset.osm_wikidata_properties,
            indirectWdProperty = props.preset.wikidata_indirect_property,
            anyEtymology = !!keys?.length || !!wdDirectProperties?.length || !!indirectWdProperty,
            entries = Object.entries(colorSchemes) as [ColorSchemeID, ColorScheme][],
            usableColorSchemes = anyEtymology ? entries : entries.filter(([, scheme]) => scheme.showWithoutEtymology);
        return usableColorSchemes.map(([id, item]) => ({
            id,
            text: t(item.textKey, item.defaultText),
            category: t(item.categoryKey, item.defaultCategoryText),
            onSelect: () => {
                setColorSchemeID(id);
                //handlers[id]();
                // this.updateChart(event);
                // onSchemeChange(id as ColorSchemeID);
            }
        }));
    }, [props.preset.osm_wikidata_keys, props.preset.osm_wikidata_properties, props.preset.wikidata_indirect_property, setColorSchemeID, t]);

    useEffect(() => {
        console.debug("StatisticsColorControl: updating stats", { colorSchemeID, lat, lon, zoom });
        handlers[colorSchemeID]();
    }, [colorSchemeID, handlers, lat, lon, zoom]);

    return <DropdownControl
        buttonContent="📊"
        dropdownItems={dropdownItems}
        selectedValue={colorSchemeID}
        title={t("color_scheme.choose_scheme")}
        position={props.position}
        className='color-ctrl' >
        <tr>
            <td colSpan={2}>
                {chartData && <Pie data={chartData} />}
            </td>
        </tr>
    </DropdownControl>;
}

const calculateFeatureSourceStats: StatisticsCalculator = (features) => {
    const osm_IDs = new Set<string>(),
        osm_wikidata_IDs = new Set<string>(),
        wikidata_IDs = new Set<string>();
    features.forEach((feature, i) => {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
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
    return new Promise(() => [stats, FEATURE_SOURCE_LAYER_COLOR] as const);
}

function calculateEtymologySourceStats(osmTextOnlyLabel: string): StatisticsCalculator {
    return (features) => {
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
        if (osm_text_names.size) stats.push({ name: osmTextOnlyLabel, color: FALLBACK_COLOR, id: "osm_text", count: osm_text_names.size });
        if (process.env.NODE_ENV === 'development') console.debug("loadEtymologySourceChartData", { features, stats, propagation_IDs, osm_wikidata_IDs, wikidata_IDs, osm_IDs, osm_text_names });
        return new Promise(() => [stats, ETYMOLOGY_SOURCE_LAYER_COLOR] as const);
    }
}

/**
 * Common gateway for all statistics based on a query to Wikidata
 */
async function downloadChartDataForWikidataIDs(idSet: Set<string>, colorSchemeID: ColorSchemeID): Promise<EtymologyStat[] | null> {
    if (idSet.size === 0) {
        if (process.env.NODE_ENV === 'development') console.debug("downloadChartDataForWikidataIDs: Skipping stats update for 0 IDs");
        return [];
    }

    const uniqueIDs = Array.from(idSet);
    if (process.env.NODE_ENV === 'development') console.debug("downloadChartDataForWikidataIDs: Updating stats", { colorSchemeID, idSet });

    try {
        const statsService = new WikidataStatsService();
        const stats = await statsService.fetchStats(uniqueIDs, colorSchemeID);

        if (!stats.length) {
            if (process.env.NODE_ENV === 'development') console.debug("downloadChartDataForWikidataIDs: empty stats received", { colorSchemeID, uniqueIDs });
            return null;
        } else {
            return stats;
        }
    } catch (e) {
        console.error("Stats fetch error", e);
        return null;
    }
}

function loadPictureAvailabilityChartData(pictureAvailableLabel: string, pictureUnavailableLabel: string): StatisticsCalculator {
    return async (features) => {
        const with_picture_IDs = new Set<string | number>(),
            unknown_picture_IDs = new Set<string>(),
            without_picture_IDs = new Set<string | number>();
        features?.forEach(props => {
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            const id = props.wikidata || props.osm_type + '/' + props.osm_id;
            if (!!props.picture || !!props.commons)
                with_picture_IDs.add(id);
            else if (props.wikidata)
                unknown_picture_IDs.add(props.wikidata);
            else
                without_picture_IDs.add(id);
        });
        const stats = await downloadChartDataForWikidataIDs(unknown_picture_IDs, ColorSchemeID.picture);
        let data: ExpressionSpecification | null = null;
        if (stats) {
            const withPictureObject = stats.find(stat => stat.id === 'available'),
                withoutPictureObject = stats.find(stat => stat.id === 'unavailable');
            if (withPictureObject) {
                withPictureObject.name = pictureAvailableLabel;
                withPictureObject.color = HAS_PICTURE_COLOR;
                withPictureObject.count += with_picture_IDs.size;
            } else {
                stats.push({
                    name: pictureAvailableLabel, color: HAS_PICTURE_COLOR, count: with_picture_IDs.size, id: 'available'
                });
            }
            if (withoutPictureObject) {
                withoutPictureObject.name = pictureUnavailableLabel;
                withoutPictureObject.color = NO_PICTURE_COLOR;
                withoutPictureObject.count += without_picture_IDs.size;
            } else {
                stats.push({
                    name: pictureUnavailableLabel, color: NO_PICTURE_COLOR, count: without_picture_IDs.size, id: 'unavailable'
                });
            }

            const statsData: (ExpressionSpecification | string)[] = []
            stats.forEach(row => {
                const color = row.color;
                if (color && row.subjects?.length) {
                    row.subjects.forEach(subject => {
                        statsData.push(["==", subject, ["get", "wikidata"]], color);
                    });
                } else {
                    if (process.env.NODE_ENV === 'development') console.debug("loadPictureAvailabilityChartData: skipping row with no color or subjects", { row });
                }
            });

            data = [
                "case",
                ["has", "picture"], HAS_PICTURE_COLOR,
                ["has", "commons"], HAS_PICTURE_COLOR,
                ["!", ["has", "wikidata"]], NO_PICTURE_COLOR,
                ...statsData,
                NO_PICTURE_COLOR
            ];
            if (process.env.NODE_ENV === 'development') console.debug("loadPictureAvailabilityChartData: setting layer color", data);
        }
        return [stats, data] as const;
    }
}

const loadWikilinkChartData: StatisticsCalculator = async (features) => {
    const wikidataIDs = new Set<string>();
    features?.forEach(props => {
        if (props.wikidata)
            wikidataIDs.add(props.wikidata);
    });
    const stats = await downloadChartDataForWikidataIDs(wikidataIDs, ColorSchemeID.feature_link_count);
    let data: ExpressionSpecification | null = null;
    if (stats) {
        const statsData: (ExpressionSpecification | string)[] = []
        stats.forEach(row => {
            const color = row.color;
            if (color && row.subjects?.length) {
                row.subjects.forEach(subject => {
                    statsData.push(["==", subject, ["get", "wikidata"]], color);
                });
            } else {
                if (process.env.NODE_ENV === 'development') console.debug("loadPictureAvailabilityChartData: skipping row with no color or subjects", { row });
            }
        });

        data = [
            "case",
            ["!", ["has", "wikidata"]], FALLBACK_COLOR,
            ...statsData,
            FALLBACK_COLOR
        ];
        if (process.env.NODE_ENV === 'development') console.debug("loadPictureAvailabilityChartData: setting layer color", data);
    }
    return [stats, data] as const;
}
