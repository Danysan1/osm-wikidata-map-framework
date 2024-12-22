import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import { ColorScheme, ColorSchemeID, colorSchemes } from "@/src/model/colorScheme";
import { getFeatureLinkedEntities, type OwmfFeature } from "@/src/model/OwmfResponse";
import type { EtymologyStat } from "@/src/model/EtymologyStat";
import type { SourcePreset } from "@/src/model/SourcePreset";
import { ArcElement, ChartData, Chart as ChartJS, Legend, Tooltip } from "chart.js";
import type { ControlPosition, DataDrivenPropertyValueSpecification } from "maplibre-gl";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { Pie } from 'react-chartjs-2';
import { useTranslation } from "react-i18next";
import { useMap, MapSourceDataEvent } from "react-map-gl/maplibre";
import { DropdownControl, DropdownItem } from "../DropdownControl/DropdownControl";
import {
  BLACK,
  BLUE,
  calculateEtymologySourceStats,
  calculateFeatureSourceStats,
  downloadChartDataForWikidataIDs,
  FALLBACK_COLOR,
  getLayerColorFromStats,
  loadPictureAvailabilityChartData,
  loadWikilinkChartData,
  ORANGE,
  RED,
  StatisticsCalculator
} from "./statistics";

ChartJS.register(ArcElement, Tooltip, Legend);

const MAX_CHART_ITEMS = 35;

interface StatisticsColorControlProps {
  preset: SourcePreset,
  position?: ControlPosition;
  layerIDs: string[];
  sourceIDs: string[];
  setLayerColor: (color: DataDrivenPropertyValueSpecification<string>) => void;
}

/**
 * Let the user choose a color scheme for the map data and see statistics about the data
 **/
export const StatisticsColorControl: FC<StatisticsColorControlProps> = ({
  preset, position, layerIDs, sourceIDs, setLayerColor
}) => {
  const { t, i18n } = useTranslation(),
    { current: map } = useMap(),
    { colorSchemeID, setColorSchemeID } = useUrlFragmentContext(),
    [chartData, setChartData] = useState<ChartData<"pie">>(),
    handlers: Record<ColorSchemeID, () => void> = useMemo(() => {
      if (process.env.NODE_ENV === 'development') console.debug(
        "StatisticsColorControl: creating handlers",
        { lang: i18n.language, layerIDs, map, setLayerColor, t }
      );
      const setFixedColor = (color: string) => {
        setLayerColor(color);
        setChartData(undefined);
      };

      const setChartStats = (stats: EtymologyStat[]) => {
        const usedStats = stats.slice(0, MAX_CHART_ITEMS),
          data: ChartData<"pie"> = {
            labels: usedStats.map(row => row.name),
            datasets: [{
              data: usedStats.map(row => row.count),
              // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
              backgroundColor: usedStats.map(row => row.color || FALLBACK_COLOR),
            }]
          };
        if (process.env.NODE_ENV === 'development') console.debug(
          "setChartStats: updating chart", { stats, usedStats, data }
        );
        setChartData(data);
      }

      const queryFeaturesOnScreen = (): OwmfFeature[] | undefined => {
        if (layerIDs.some(layerID => !map?.getLayer(layerID))) {
          if (process.env.NODE_ENV === "development") console.warn(
            "queryFeaturesOnScreen: At least one layer is missing, can't update stats",
            { layers: layerIDs, map }
          );
          return undefined;
        }

        return map?.queryRenderedFeatures({ layers: layerIDs });
      }

      const calculateLocalChartData = async (calculateChartData: StatisticsCalculator) => {
        const features = queryFeaturesOnScreen()?.map(f => f.properties!) ?? [];
        const [stats, color] = await calculateChartData(features, i18n.language);
        if (process.env.NODE_ENV === 'development') console.debug(
          "calculateLocalChartData: updating chart", { features, stats, color }
        );
        if (color) setLayerColor(color);
        if (stats) setChartStats(stats);
      }

      /**
       * Downloads the statistics from Wikidata and loads it into the chart
       */
      const downloadChartDataFromWikidata = async (colorSchemeID: ColorSchemeID) => {
        let wikidataIDs: string[] = [];
        try {
          wikidataIDs = queryFeaturesOnScreen()
            ?.flatMap(f => getFeatureLinkedEntities(f))
            ?.filter(etymology => etymology.wikidata)
            ?.map(etymology => etymology.wikidata!) ?? [];
        } catch (error) {
          if (process.env.NODE_ENV === 'development') console.error(
            "downloadChartDataFromWikidata: Error querying rendered features",
            { colorSchemeID, layers: layerIDs, error }
          );

          return;
        }

        const idSet = new Set(wikidataIDs), // de-duplicate
          stats = await downloadChartDataForWikidataIDs(idSet, colorSchemeID, i18n.language);
        if (stats?.length) {
          setChartStats(stats)
          setLayerColor(getLayerColorFromStats(stats));
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
    }, [i18n.language, layerIDs, map, setLayerColor, t]);

  const dropdownItems = useMemo((): DropdownItem[] => {
    const keys = preset.osm_wikidata_keys,
      wdDirectProperties = preset.osm_wikidata_properties,
      indirectWdProperty = preset.wikidata_indirect_property,
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
  }, [preset.osm_wikidata_keys, preset.osm_wikidata_properties, preset.wikidata_indirect_property, setColorSchemeID, t]);

  const onSourceDataHandler = useCallback((e: MapSourceDataEvent) => {
    if (!e.isSourceLoaded || e.dataType !== "source" || !sourceIDs.includes(e.sourceId))
      return;

    if (process.env.NODE_ENV === "development") console.debug(
      "StatisticsColorControl: updating stats after data update", { colorSchemeID, e }
    );
    handlers[colorSchemeID]();
  }, [colorSchemeID, handlers, sourceIDs]);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") console.debug(
      "StatisticsColorControl: updating stats after color scheme change:", colorSchemeID
    );
    handlers[colorSchemeID]();
  }, [colorSchemeID, handlers]);

  return <DropdownControl
    buttonContent="📊"
    dropdownItems={dropdownItems}
    selectedValue={colorSchemeID}
    title={t("color_scheme.choose_scheme")}
    position={position}
    className='color-ctrl'
    onSourceData={onSourceDataHandler}
  >
    {!!chartData?.labels?.length && <Pie data={chartData} className="stats_chart" />}
  </DropdownControl>;
}
