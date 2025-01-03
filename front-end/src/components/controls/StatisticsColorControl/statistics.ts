import { ColorSchemeID } from "@/src/model/colorScheme";
import { Etymology, OsmInstance } from "@/src/model/Etymology";
import { EtymologyStat } from "@/src/model/EtymologyStat";
import { getPropTags, OwmfFeatureProperties } from "@/src/model/OwmfFeatureProperties";
import { WikidataStatsService } from "@/src/services/WikidataStatsService/WikidataStatsService";
import { ExpressionSpecification } from "maplibre-gl";

export type StatisticsCalculator = (features: OwmfFeatureProperties[], language: string) => Promise<readonly [EtymologyStat[] | null, ExpressionSpecification | null]>;

export const FALLBACK_COLOR = '#000000',
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
    ["all",
      ["has", "from_osm"], // TODO remove (deprecated)
      ["to-boolean", ["get", "from_osm"]],
      ["has", "from_wikidata"],
      ["to-boolean", ["get", "from_wikidata"]]
    ], OSM_WIKIDATA_COLOR,
    ["all",
      ["has", "from_osm_instance"],
      [">", ["length", ["get", "from_osm_instance"]], 0],
      ["has", "from_wikidata"],
      ["to-boolean", ["get", "from_wikidata"]]
    ], OSM_WIKIDATA_COLOR,
    ["all",
      ["has", "from_osm"], // TODO remove (deprecated)
      ["to-boolean", ["get", "from_osm"]]
    ], OSM_COLOR,
    ["all",
      ["has", "from_osm_instance"],
      [">", ["length", ["get", "from_osm_instance"]], 0]
    ], OSM_COLOR,
    ["all",
      ["has", "from_wikidata"],
      ["to-boolean", ["get", "from_wikidata"]]
    ], WIKIDATA_COLOR,
    FALLBACK_COLOR
  ],
  ETYMOLOGY_SOURCE_LAYER_COLOR: ExpressionSpecification = [
    "case",
    ["!", ["has", "linked_entities"]], FALLBACK_COLOR,
    ["==", ["length", ["get", "linked_entities"]], 0], FALLBACK_COLOR,
    ["==", ["get", "linked_entities"], "[]"], FALLBACK_COLOR,

    // Checks for vector tiles and PMTiles (where the linked_entities array is JSON-encoded with spaces)
    ["in", '"propagated" : true', ["get", "linked_entities"]], PROPAGATED_COLOR,
    ["all",
      ["has", "from_osm"], // TODO remove (deprecated)
      ["to-boolean", ["get", "from_osm"]],
      ["in", '"from_wikidata" : true', ["get", "linked_entities"]],
    ], OSM_WIKIDATA_COLOR,
    ["all",
      ["has", "from_osm_instance"],
      ["in", '"from_wikidata" : true', ["get", "linked_entities"]],
    ], OSM_WIKIDATA_COLOR,
    ["in", '"from_wikidata" : true', ["get", "linked_entities"]], WIKIDATA_COLOR,
    ["in", '"from_osm" : true', ["get", "linked_entities"]], OSM_COLOR, // TODO remove (deprecated)
    ["in", '"from_osm_instance" : "', ["get", "linked_entities"]], OSM_COLOR,

    // Checks for cases where the map library JSON-encodes the linked_entities array without spaces
    ["in", '"propagated":true', ["to-string", ["get", "linked_entities"]]], PROPAGATED_COLOR,
    ["all",
      ["has", "from_osm"], // TODO remove (deprecated)
      ["to-boolean", ["get", "from_osm"]],
      ["in", '"from_wikidata":true', ["to-string", ["get", "linked_entities"]]],
    ], OSM_WIKIDATA_COLOR,
    ["all",
      ["has", "from_osm_instance"],
      ["in", '"from_wikidata":true', ["to-string", ["get", "linked_entities"]]],
    ], OSM_WIKIDATA_COLOR,
    ["in", '"from_wikidata":true', ["to-string", ["get", "linked_entities"]]], WIKIDATA_COLOR,
    ["in", '"from_osm":true', ["to-string", ["get", "linked_entities"]]], OSM_COLOR, // TODO remove (deprecated)
    ["in", '"from_osm_instance":"', ["to-string", ["get", "linked_entities"]]], OSM_COLOR,

    FALLBACK_COLOR
  ];

/**
 * Common gateway for all statistics based on a query to Wikidata
 */
export async function downloadChartDataForWikidataIDs(
  idSet: Set<string>, colorSchemeID: ColorSchemeID, language: string
): Promise<EtymologyStat[] | null> {
  if (idSet.size === 0) {
    console.warn("downloadChartDataForWikidataIDs: Skipping stats update for 0 IDs");
    return [];
  }

  const uniqueIDs = Array.from(idSet);
  console.debug("downloadChartDataForWikidataIDs: Fetching and updating stats", { colorSchemeID, idSet });

  try {
    const statsService = new WikidataStatsService(language);
    const stats = await statsService.fetchStats(uniqueIDs, colorSchemeID);

    if (!stats.length) {
      console.debug("downloadChartDataForWikidataIDs: empty stats received", { colorSchemeID, uniqueIDs });
      return null;
    } else {
      console.debug("downloadChartDataForWikidataIDs: stats fetched", { colorSchemeID, uniqueIDs, stats });
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
    console.debug(
      "loadPictureAvailabilityChartData: downloading unknown picture chart data",
      { features, language, with_picture_IDs, unknown_picture_IDs, without_picture_IDs }
    );
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
          console.debug(
            "loadPictureAvailabilityChartData: skipping row with no color or subjects",
            row
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
    console.debug(
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
  console.debug(
    "loadWikilinkChartData: downloading chart data", { features, language, wikidataIDs }
  );
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
        console.debug(
          "loadWikilinkChartData: skipping row with no color or subjects", row
        );
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
  console.debug("loadWikilinkChartData", { features, out, wikidataIDs });
  return out;
}

export const calculateFeatureSourceStats: StatisticsCalculator = (features) => {
  const osmInstances = [OsmInstance.OpenStreetMap, OsmInstance.OpenHistoricalMap], //Object.keys(OsmInstance).filter(key => isNaN(Number(key))),
    IDs_by_source: Record<string, Set<string>> = {
      "Wikidata": new Set<string>()
    };
  osmInstances.forEach(instance => {
    IDs_by_source[instance] = new Set<string>();
    IDs_by_source[instance + " + Wikidata"] = new Set<string>();
  });
  features.forEach((feature, i) => {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const id = feature?.wikidata || getPropTags(feature).name?.toLowerCase() || i.toString();
    osmInstances.forEach(instance => {
      if ((!!feature?.from_osm || feature?.from_osm_instance === instance) && feature?.from_wikidata)
        IDs_by_source[instance + " + Wikidata"].add(id);
      else if (!!feature.from_osm || feature?.from_osm_instance === instance)
        IDs_by_source[instance].add(id);
      else if (feature?.from_wikidata)
        IDs_by_source.Wikidata.add(id);
    });
  });

  const stats: EtymologyStat[] = Object.keys(IDs_by_source).filter(source => IDs_by_source[source].size > 0).map(source => {
    let color: string;
    if (source === "Wikidata") color = WIKIDATA_COLOR;
    else if (source.endsWith("Wikidata")) color = OSM_WIKIDATA_COLOR;
    else color = OSM_COLOR;

    return { name: source, color, id: source, count: IDs_by_source[source].size };
  });

  const out = [stats, FEATURE_SOURCE_LAYER_COLOR] as const;
  console.debug(
    "calculateFeatureSourceStats",
    { features: features, out, IDs_by_source, osmInstances }
  );
  return Promise.resolve(out);
}

export function calculateEtymologySourceStats(osmTextOnlyLabel: string): StatisticsCalculator {
  return (features) => {
    const osm_IDs = new Set<string>(),
      ohm_IDs = new Set<string>(),
      osm_text_names = new Set<string>(),
      osm_wikidata_IDs = new Set<string>(),
      ohm_wikidata_IDs = new Set<string>(),
      wikidata_IDs = new Set<string>(),
      propagation_IDs = new Set<string>();
    features.forEach(feature => {
      const rawEntities = feature?.linked_entities,
        entities = typeof rawEntities === 'string' ? JSON.parse(rawEntities) as Etymology[] : rawEntities;

      if (entities?.some(ety => ety.wikidata)) {
        entities.forEach(etymology => {
          if (!etymology.wikidata) {
            console.debug("Skipping etymology with no Wikidata ID in source calculation", etymology);
          } else if (etymology.propagated) {
            propagation_IDs.add(etymology.wikidata);
          } else if ((!!feature?.from_osm || feature?.from_osm_instance === OsmInstance.OpenStreetMap) && etymology.from_wikidata) {
            osm_wikidata_IDs.add(etymology.wikidata);
          } else if (feature?.from_osm_instance === OsmInstance.OpenHistoricalMap && etymology.from_wikidata) {
            ohm_wikidata_IDs.add(etymology.wikidata);
          } else if (etymology.from_wikidata) {
            wikidata_IDs.add(etymology.wikidata);
          } else if (!!etymology.from_osm || etymology.from_osm_instance === OsmInstance.OpenStreetMap) {
            osm_IDs.add(etymology.wikidata);
          } else if (etymology.from_osm_instance === OsmInstance.OpenHistoricalMap) {
            ohm_IDs.add(etymology.wikidata);
          } else {
            console.debug("Unknown etymology source", feature, etymology);
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
    if (ohm_wikidata_IDs.size) stats.push({
      name: "OHM + Wikidata", color: OSM_WIKIDATA_COLOR, id: 'ohm_wikidata', count: ohm_wikidata_IDs.size
    });
    if (wikidata_IDs.size) stats.push({
      name: "Wikidata", color: WIKIDATA_COLOR, id: 'wikidata', count: wikidata_IDs.size
    });
    if (osm_IDs.size) stats.push({
      name: "OpenStreetMap", color: OSM_COLOR, id: 'osm', count: osm_IDs.size
    });
    if (ohm_IDs.size) stats.push({
      name: "OpenHistoricalMap", color: OSM_COLOR, id: 'ohm', count: ohm_IDs.size
    });
    if (osm_text_names.size) stats.push({
      name: osmTextOnlyLabel, color: FALLBACK_COLOR, id: "osm_text", count: osm_text_names.size
    });

    const out = [stats, ETYMOLOGY_SOURCE_LAYER_COLOR] as const;
    console.debug(
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
      // In vector tiles linked_entities array is JSON-encoded
      // In GeoJSON the map library leaves the linked_entities array as an array of objects
      // "to-string" converts either way to string in order to check whether it contains the subject
      row.subjects.forEach(subject => {
        statsData.push(["in", subject + '"', ["to-string", ["get", "linked_entities"]]], color);
      });
    } else if (row.count > 1) {
      console.debug(
        "getLayerColorFromStats: skipping row with no color or subjects", row
      );
    }
  });

  const data: ExpressionSpecification = [
    "case",
    ["!", ["has", "linked_entities"]], FALLBACK_COLOR,
    ["==", ["length", ["get", "linked_entities"]], 0], FALLBACK_COLOR,
    ["==", ["get", "linked_entities"], "[]"], FALLBACK_COLOR,
    ...statsData,
    FALLBACK_COLOR
  ];

  console.debug(
    "getLayerColorFromStats: setting layer color", { stats, data }
  );
  return data;
}

