import { useSnackbarContext } from "@/src/context/SnackbarContext";
import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import { DEFAULT_LANGUAGE } from "@/src/i18n/common";
import {
  BackgroundStyle,
  jawgStyle,
  mapboxStyle,
  maptilerStyle,
  openHistoricalMapStyle,
  stadiaStyle,
  versaTilesStyle,
} from "@/src/model/backgroundStyle";
import type {
  DataDrivenPropertyValueSpecification,
  ExpressionSpecification,
} from "maplibre-gl";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ControlPosition, StyleSpecification } from "react-map-gl/maplibre";
import { DropdownControl } from "./DropdownControl/DropdownControl";

function getBackgroundStyles() {
  const maptiler_key = process.env.owmf_maptiler_key,
    jawg_token = process.env.owmf_jawg_token,
    mapbox_token = process.env.owmf_mapbox_token,
    backgroundStyles: BackgroundStyle[] = [];

  if (mapbox_token) {
    backgroundStyles.push(
      mapboxStyle("mapbox_streets", "Streets", "mapbox", "streets-v12", mapbox_token),
      mapboxStyle("mapbox_outdoors", "Outdoors", "mapbox", "outdoors-v12", mapbox_token),
      mapboxStyle("mapbox_light", "Light", "mapbox", "light-v11", mapbox_token),
      mapboxStyle("mapbox_dark", "Dark", "mapbox", "dark-v11", mapbox_token),
      mapboxStyle(
        "mapbox_satellite",
        "Satellite",
        "mapbox",
        "satellite-streets-v12",
        mapbox_token
      )
    );
  }

  if (process.env.owmf_enable_versatiles) {
    backgroundStyles.push(
      versaTilesStyle("versatiles_colorful", "Colorful", "colorful"),
      versaTilesStyle("versatiles_neutrino", "Neutrino", "neutrino"),
      versaTilesStyle("versatiles_eclipse", "Eclipse", "eclipse"),
      versaTilesStyle("versatiles_graybeard", "Graybeard", "graybeard")
    );
  }

  if (process.env.owmf_enable_stadia_maps) {
    backgroundStyles.push(
      stadiaStyle("stadia_alidade_dark", "Alidade smooth dark", "alidade_smooth_dark"),
      stadiaStyle("stadia_alidade", "Alidade smooth", "alidade_smooth"),
      //stadiaStyle('stadia_satellite', "Alidade Satellite", 'alidade_satellite'),
      stadiaStyle("stadia_outdoors", "Outdoors", "outdoors"),
      stadiaStyle("stadia_osm_bright", "OSM Bright", "osm_bright"),
      stadiaStyle("stamen_terrain", "Stamen Terrain", "stamen_terrain"),
      stadiaStyle("stamen_toner", "Stamen Toner", "stamen_toner"),
      stadiaStyle("stamen_toner_lite", "Stamen Toner Lite", "stamen_toner_lite"),
      stadiaStyle("stamen_watercolor", "Stamen Watercolor", "stamen_watercolor"),
      {
        id: "americana",
        vendorText: "OpenStreetMap US",
        styleText: "OSM Americana",
        styleUrl: "https://americanamap.org/style.json",
        keyPlaceholder: "https://tile.ourmap.us/data/v3.json",
        key: "https://tiles.stadiamaps.com/data/openmaptiles.json",
      }
    );
  }

  if (jawg_token) {
    backgroundStyles.push(
      jawgStyle("jawg_streets", "Streets", "jawg-streets", jawg_token),
      jawgStyle("jawg_streets_3d", "Streets 3D", "jawg-streets", jawg_token, true),
      jawgStyle("jawg_lagoon", "Lagoon", "jawg-lagoon", jawg_token),
      jawgStyle("jawg_lagoon_3d", "Lagoon 3D", "jawg-lagoon", jawg_token, true),
      jawgStyle("jawg_sunny", "Sunny", "jawg-sunny", jawg_token),
      jawgStyle("jawg_light", "Light", "jawg-light", jawg_token),
      jawgStyle("jawg_terrain", "Terrain", "jawg-terrain", jawg_token),
      jawgStyle("jawg_dark", "Dark", "jawg-dark", jawg_token)
    );
  }

  if (maptiler_key) {
    backgroundStyles.push(
      {
        id: "liberty",
        vendorText: "Maputnik",
        styleText: "OSM Liberty",
        styleUrl: "https://maputnik.github.io/osm-liberty/style.json",
        keyPlaceholder: "{key}",
        key: maptiler_key,
      },
      maptilerStyle("maptiler_backdrop", "Backdrop", "backdrop", maptiler_key),
      maptilerStyle("maptiler_basic", "Basic", "basic-v2", maptiler_key),
      maptilerStyle("maptiler_bright", "Bright", "bright-v2", maptiler_key),
      maptilerStyle("maptiler_dataviz", "Dataviz", "dataviz", maptiler_key),
      maptilerStyle("maptiler_dark", "Dark", "dataviz-dark", maptiler_key),
      maptilerStyle("maptiler_ocean", "Ocean", "ocean", maptiler_key),
      maptilerStyle("maptiler_osm_carto", "OSM Carto", "openstreetmap", maptiler_key),
      maptilerStyle("maptiler_outdoors", "Outdoors", "outdoor-v2", maptiler_key),
      maptilerStyle("maptiler_satellite_hybrid", "Satellite", "hybrid", maptiler_key),
      maptilerStyle("maptiler_streets", "Streets", "streets-v2", maptiler_key),
      maptilerStyle("maptiler_toner", "Toner", "toner-v2", maptiler_key),
      maptilerStyle("maptiler_topo", "Topo", "topo-v2", maptiler_key),
      maptilerStyle("maptiler_winter", "Winter", "winter-v2", maptiler_key)
    );
  }

  if (process.env.owmf_enable_open_historical_map === "true") {
    backgroundStyles.push(
      openHistoricalMapStyle("ohm_main", "Historic", "main/main"),
      openHistoricalMapStyle("ohm_rail", "Railway", "rail/rail"),
      openHistoricalMapStyle(
        "ohm_ja_scroll",
        "Japanese scroll",
        "japanese_scroll/ohm-japanese-scroll-map"
      ),
      openHistoricalMapStyle("ohm_woodblock", "Woodblock", "woodblock/woodblock")
    );
  }

  // backgroundStyles.push({
  //   id: "osm_vector",
  //   styleText: "OSM Vector",
  //   styleUrl: "https://vector.openstreetmap.org/shortbread_v1/tilejson.json",
  //   vendorText: "OpenStreetMap",
  // });

  return backgroundStyles;
}

interface BackgroundStyleControlProps {
  position?: ControlPosition;
  setBackgroundStyle: (style: StyleSpecification) => void;
}

/**
 * Let the user choose the background style from a list of styles.
 **/
export const BackgroundStyleControl: FC<BackgroundStyleControlProps> = ({
  position,
  setBackgroundStyle,
}) => {
  const { t, i18n } = useTranslation(),
    { backgroundStyleID, setBackgroundStyleID, year } = useUrlFragmentContext(),
    { showSnackbar } = useSnackbarContext(),
    [globeProjection, setGlobeProjection] = useState<boolean>(false),
    backgroundStyles = useMemo(() => getBackgroundStyles(), []),
    style = useMemo(
      () => backgroundStyles.find((style) => style.id === backgroundStyleID),
      [backgroundStyleID, backgroundStyles]
    ),
    [jsonStyleSpec, setJsonStyleSpec] = useState<string>(),
    dropdownItems = useMemo(
      () =>
        backgroundStyles.map((style) => ({
          id: style.id,
          category: style.vendorText,
          text: style.styleText,
          onSelect: () => setBackgroundStyleID(style.id),
        })),
      [backgroundStyles, setBackgroundStyleID]
    );

  /**
   * Fetch the Maplibre style specification JSON whenever the selected style is changed
   */
  useEffect(() => {
    if (!style) {
      console.warn(
        "Empty default background style, using the first available",
        backgroundStyles
      );
      setBackgroundStyleID(backgroundStyles[0].id);
    } else {
      console.debug("Fetching style", style);
      fetch(style.styleUrl)
        .then((resp) => resp.text())
        .then((json) => setJsonStyleSpec(json))
        .catch((e) => {
          console.error("Failed fetching json style", e);
          showSnackbar(t("snackbar.map_error"));
        });
    }
  }, [backgroundStyles, setBackgroundStyleID, showSnackbar, style, t]);

  
  /**
   * Apply the appropriate changes to the style specification based on the local settings:
   * - Placeholder (ex. '{key}') replacement
   * - Filtering by year
   * - Label selection based on selected language
   * - Globe projection setting
   */
  const updateStyleSpec = useCallback(
    (styleSpec: StyleSpecification) => {
      if (style?.keyPlaceholder && style.key) {
        Object.values(styleSpec.sources)
          .filter((src) => src.type === "vector")
          .forEach((src) => {
            if (src.url) src.url = src.url.replace(style.keyPlaceholder!, style.key!);
            else delete src.url;
          });
      }

      if (style?.canFilterByDate) {
        /**
         * Filter the features by date, where applicable
         *
         * @see https://wiki.openstreetmap.org/wiki/OpenHistoricalMap/Reuse#Vector_tiles_and_stylesheets
         */
        const startFilter: ExpressionSpecification = [
          "any",
          ["!", ["has", "start_date"]],
          [">=", year, ["get", "start_decdate"]],
        ];
        const endFilter: ExpressionSpecification = [
          "any",
          ["!", ["has", "end_date"]],
          ["<", year, ["get", "end_decdate"]],
        ];
        styleSpec.layers.forEach((l) => {
          if (l.type !== "raster" && l.type !== "background") {
            if (!l.filter) l.filter = ["all", startFilter, endFilter];
            else if (Array.isArray(l.filter) && l.filter[0] === "all")
              (l.filter as ExpressionSpecification[]).push(startFilter, endFilter);
            else if (Array.isArray(l.filter))
              l.filter = [
                "all",
                l.filter as ExpressionSpecification,
                startFilter,
                endFilter,
              ];
            else console.debug("Skipping filtering layer by date", l);
          }
        });
        console.debug("styleSpec", styleSpec);
      }

      /**
       * Set the application culture for i18n
       *
       * Mainly, sets the map's query to get labels.
       * OpenMapTiles (Stadia, MapTiler, ...) vector tiles use use the fields name:*.
       * Mapbox vector tiles use the fields name_*.
       *
       * @see https://documentation.maptiler.com/hc/en-us/articles/4405445343889-How-to-set-the-language-for-your-map
       * @see https://maplibre.org/maplibre-gl-js-docs/example/language-switch/
       * @see https://docs.mapbox.com/mapbox-gl-js/example/language-switch/
       * @see https://docs.mapbox.com/mapbox-gl-js/api/map/#map#setlayoutproperty
       */
      const newTextField: DataDrivenPropertyValueSpecification<string> = [
        "coalesce",
        ["get", "name:" + i18n.language], // Main language name in OpenMapTiles vector tiles
        ["get", "name_" + i18n.language], // Main language name in Mapbox vector tiles
        ["get", "name"],
        ["get", "name:" + DEFAULT_LANGUAGE], // Default language name in OpenMapTiles vector tiles. Usually the name in the main language is in name=*, not in name:<main_language>=*, so using name:<default_launguage>=* before name=* would often hide the name in the main language
        ["get", "name_" + DEFAULT_LANGUAGE], // Default language name in Mapbox vector tiles. Usually the name in the main language is in name=*, not in name_<main_language>=*, so using name_<default_launguage>=* before name=* would often hide the name in the main language
      ];
      styleSpec.layers?.forEach((layer) => {
        if (layer.type === "symbol" && layer.layout) {
          const labelExpression = layer.layout["text-field"],
            isSimpleName =
              typeof labelExpression === "string" && labelExpression.startsWith("{name"); // "{name}" / "{name:en}" / "{name:latin}\n{name:nonlatin}" / ...
          if (isSimpleName || someArrayItemStartWithName(labelExpression)) {
            layer.layout["text-field"] = newTextField;
          }
        }
      });

      if (styleSpec.projection?.type) {
        styleSpec.projection = { type: styleSpec.projection.type };
      } else {
        styleSpec.projection = globeProjection ? {
          type: "globe" // Globe view currently suffers horizon plane clipping, the solution to this problem is described at https://maplibre.org/maplibre-gl-js/docs/examples/globe-custom-simple/
        } : undefined;
      }

      // styleSpec.glyphs = "http://fonts.openmaptiles.org/{fontstack}/{range}.pbf";
    },
    [
      globeProjection,
      i18n.language,
      style?.canFilterByDate,
      style?.key,
      style?.keyPlaceholder,
      year,
    ]
  );

  /**
   * Parse the fetched JSON style specification, update it with local settings and use it for the map
   */
  useEffect(() => {
    if (!jsonStyleSpec) {
      console.debug("Waiting for background style spec to be fetched");
      return;
    }

    try {
      const styleSpec = JSON.parse(jsonStyleSpec) as StyleSpecification;
      updateStyleSpec(styleSpec);
      console.debug("Setting json style", styleSpec);
      setBackgroundStyle(styleSpec);
    } catch (e) {
      console.error("Failed parsing and applying json style specification", {
        jsonStyleSpec,
        e,
      });
      showSnackbar(t("snackbar.map_error"));
    }
  }, [jsonStyleSpec, setBackgroundStyle, showSnackbar, t, updateStyleSpec]);

  const toggleGlobeProjection = useCallback(() => setGlobeProjection((old) => !old), []);

  return (
    <DropdownControl
      buttonContent="🌍"
      dropdownItems={dropdownItems}
      selectedValue={backgroundStyleID}
      title={t("choose_basemap")}
      position={position}
      className="background-style-ctrl"
    >
      <label>
        <input
          type="checkbox"
          name="globe_projection"
          checked={globeProjection}
          onChange={toggleGlobeProjection}
          alt={t("globe_projection")}
        />
        &nbsp;
        {t("globe_projection", "Globe projection")}
      </label>
    </DropdownControl>
  );
};

/**
 * Checks recursively if any element in the array or in it sub-arrays is a string that starts with "name"
 */
function someArrayItemStartWithName(expression: unknown): boolean {
  return (
    Array.isArray(expression) &&
    expression.some(
      (x) =>
        (typeof x === "string" && x.startsWith("name")) || someArrayItemStartWithName(x)
    )
  );
}
