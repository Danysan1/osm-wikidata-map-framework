import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import { SourcePreset } from "@/src/model/SourcePreset";
import { colorSchemes } from "@/src/model/colorScheme";
import { ArcElement, ChartData, Chart as ChartJS, Legend, Tooltip } from "chart.js";
import type { ControlPosition, ExpressionSpecification } from "maplibre-gl";
import { useTranslation } from "next-i18next";
import { FC, useMemo, useState } from "react";
import { Pie } from 'react-chartjs-2';
import { useMap } from "react-map-gl/maplibre";
import { DropdownControl, DropdownItem } from "./DropdownControl";

ChartJS.register(ArcElement, Tooltip, Legend);

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

const MAX_CHART_ITEMS = 35,
    PROPAGATED_COLOR = '#ff3333',
    OSM_WIKIDATA_COLOR = '#33ffee',
    WIKIDATA_COLOR = '#3399ff',
    OSM_COLOR = '#33ff66',
    FALLBACK_COLOR = '#000000',
    HAS_PICTURE_COLOR = '#33ff66',
    NO_PICTURE_COLOR = '#ff3333',
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
    layerPaintPropertyMap: Record<string, string>;
    position?: ControlPosition;
}

/**
 * Let the user choose a color scheme for the map data and see statistics about the data
 **/
export const StatisticsColorControl: FC<StatisticsColorControlProps> = (props) => {
    const { t } = useTranslation(),
        { colorSchemeID, setColorSchemeID } = useUrlFragmentContext(),
        [chartData, setChartData] = useState<ChartData<"pie">>(),
        { current: map } = useMap();

    const dropdownItems = useMemo((): DropdownItem[] => {
        const keys = props.preset.osm_wikidata_keys,
            wdDirectProperties = props.preset.osm_wikidata_properties,
            indirectWdProperty = props.preset.wikidata_indirect_property,
            anyEtymology = !!keys?.length || !!wdDirectProperties?.length || !!indirectWdProperty,
            entries = Object.entries(colorSchemes),
            usableColorSchemes = anyEtymology ? entries : entries.filter(([, scheme]) => scheme.showWithoutEtymology);
        return usableColorSchemes.map(([id, item]) => ({
            id,
            text: t(item.textKey, item.defaultText),
            category: t(item.categoryKey, item.defaultCategoryText),
            onSelect: (event) => {
                // this.updateChart(event);
                // onSchemeChange(id as ColorSchemeID);
            }
        }));
    }, [props.preset.osm_wikidata_keys, props.preset.osm_wikidata_properties, props.preset.wikidata_indirect_property, t]);


    return <DropdownControl
        buttonContent="📊"
        dropdownItems={dropdownItems}
        selectedValue={colorSchemeID}
        title={t("color_scheme.choose_scheme")}
        position={props.position}
        className='color-ctrl'
    >
        <tr>
            <td colSpan={2}>
                {chartData && <Pie data={chartData} />}
            </td>
        </tr>
    </DropdownControl>;
}
