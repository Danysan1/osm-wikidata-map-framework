import { ColorSchemeID } from "@/src/model/colorScheme";
import { Etymology } from "@/src/model/Etymology";
import { EtymologyFeatureProperties } from "@/src/model/EtymologyFeatureProperties";
import { EtymologyStat } from "@/src/model/EtymologyStat";
import { WikidataStatsService } from "@/src/services/WikidataStatsService/WikidataStatsService";
import { ExpressionSpecification } from "maplibre-gl";

export type StatisticsCalculator = (features: EtymologyFeatureProperties[], language: string) => Promise<readonly [EtymologyStat[] | null, ExpressionSpecification | null]>;

export const FALLBACK_COLOR = '#3bb2d0',
  BLUE = '#3bb2d0',
  RED = '#e55e5e',
  ORANGE = '#fbb03b',
  BLACK = '#223b53';

const PROPAGATED_COLOR = '#ff3333',
  OSM_WIKIDATA_COLOR = '#33ffee',
  WIKIDATA_COLOR = '#3399ff',
  OSM_COLOR = '#33ff66',
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

/**
 * Common gateway for all statistics based on a query to Wikidata
 */
export async function downloadChartDataForWikidataIDs(
  idSet: Set<string>, colorSchemeID: ColorSchemeID, language: string
): Promise<EtymologyStat[] | null> {
  if (idSet.size === 0) {
    if (process.env.NODE_ENV === 'development') console.debug(
      "downloadChartDataForWikidataIDs: Skipping stats update for 0 IDs"
    );
    return [];
  }

  const uniqueIDs = Array.from(idSet);
  if (process.env.NODE_ENV === 'development') console.debug(
    "downloadChartDataForWikidataIDs: Updating stats", { colorSchemeID, idSet }
  );

  try {
    const statsService = new WikidataStatsService(language);
    const stats = await statsService.fetchStats(uniqueIDs, colorSchemeID);

    if (!stats.length) {
      if (process.env.NODE_ENV === 'development') console.debug(
        "downloadChartDataForWikidataIDs: empty stats received",
        { colorSchemeID, uniqueIDs }
      );
      return null;
    } else {
      return stats;
    }
  } catch (e) {
    console.error("Stats fetch error", e);
    return null;
  }
}

export function loadPictureAvailabilityChartData(pictureAvailableLabel: string, pictureUnavailableLabel: string): StatisticsCalculator {
  return async (features, language) => {
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
    const stats = await downloadChartDataForWikidataIDs(unknown_picture_IDs, ColorSchemeID.picture, language);
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
          if (process.env.NODE_ENV === 'development') console.debug(
            "loadPictureAvailabilityChartData: skipping row with no color or subjects",
            { row }
          );
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
    }

    const out = [stats, data] as const;
    if (process.env.NODE_ENV === 'development') console.debug(
      "loadPictureAvailabilityChartData",
      { features, out, with_picture_IDs, unknown_picture_IDs, without_picture_IDs }
    );
    return out;
  }
}

export const loadWikilinkChartData: StatisticsCalculator = async (features, language) => {
  const wikidataIDs = new Set<string>();
  features?.forEach(props => {
    if (props.wikidata)
      wikidataIDs.add(props.wikidata);
  });
  const stats = await downloadChartDataForWikidataIDs(wikidataIDs, ColorSchemeID.feature_link_count, language);

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
  }

  const out = [stats, data] as const;
  if (process.env.NODE_ENV === 'development') console.debug(
    "loadWikilinkChartData", { features, out, wikidataIDs }
  );
  return out;
}

export const calculateFeatureSourceStats: StatisticsCalculator = (features) => {
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

  const out = [stats, FEATURE_SOURCE_LAYER_COLOR] as const;
  if (process.env.NODE_ENV === 'development') console.debug(
    "calculateFeatureSourceStats",
    { features: features, out, osm_wikidata_IDs, wikidata_IDs, osm_IDs }
  );
  return Promise.resolve(out);
}

export function calculateEtymologySourceStats(osmTextOnlyLabel: string): StatisticsCalculator {
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
    if (propagation_IDs.size) stats.push({
      name: "Propagation", color: PROPAGATED_COLOR, id: 'propagation', count: propagation_IDs.size
    });
    if (osm_wikidata_IDs.size) stats.push({
      name: "OSM + Wikidata", color: OSM_WIKIDATA_COLOR, id: 'osm_wikidata', count: osm_wikidata_IDs.size
    });
    if (wikidata_IDs.size) stats.push({
      name: "Wikidata", color: WIKIDATA_COLOR, id: 'wikidata', count: wikidata_IDs.size
    });
    if (osm_IDs.size) stats.push({
      name: "OpenStreetMap", color: OSM_COLOR, id: 'osm_wikidata', count: osm_IDs.size
    });
    if (osm_text_names.size) stats.push({
      name: osmTextOnlyLabel, color: FALLBACK_COLOR, id: "osm_text", count: osm_text_names.size
    });

    const out = [stats, ETYMOLOGY_SOURCE_LAYER_COLOR] as const;
    if (process.env.NODE_ENV === 'development') console.debug(
      "calculateEtymologySourceStats",
      { features, out, propagation_IDs, osm_wikidata_IDs, wikidata_IDs, osm_IDs, osm_text_names, osmTextOnlyLabel }
    );
    return Promise.resolve(out);
  }
}

export function getLayerColorFromStats(stats: EtymologyStat[]) {
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

  if (process.env.NODE_ENV === 'development') console.debug(
    "getLayerColorFromStats: setting layer color", { stats, data }
  );
  return data;
}

