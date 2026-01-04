"use client";

import {
  DataDrivenPropertyValueSpecification,
  ExpressionSpecification,
  RequestTransformFunction,
} from "maplibre-gl";
import { isMapboxURL, transformMapboxUrl } from "maplibregl-mapbox-request-transformer";
import {
  FC,
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { preload } from "react-dom";
import { useTranslation } from "react-i18next";
import { StyleSpecification } from "react-map-gl/maplibre";
import { DEFAULT_LANGUAGE } from "../i18n/common";
import { BACKGROUND_STYLES, BackgroundStyle } from "../model/backgroundStyle";
import { useSnackbarContext } from "./SnackbarContext";
import { useUrlFragmentContext } from "./UrlFragmentContext";

const DEFAULT_PROJECTION = "mercator";

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

interface BackgroundStyleState {
  style?: BackgroundStyle;
  mapStyle?: StyleSpecification;
  requestTransformFunction?: RequestTransformFunction;
  projectionID: string;
  setProjectionID: (projection: string) => void;
}

const BackgroundStyleContext = createContext<BackgroundStyleState>({
  projectionID: DEFAULT_PROJECTION,
  setProjectionID: () => {
    /* placeholder */
  },
});

/**
 * Handles the fetching and updating of the map style each time the selected style or year changes
 */
export const useBackgroundStyleContext = () => useContext(BackgroundStyleContext);

export const BackgroundStyleContextProvider: FC<PropsWithChildren> = ({ children }) => {
  if (process.env.NEXT_PUBLIC_OWMF_default_background_style === "stamen_toner_lite") {
    preload("https://tiles.stadiamaps.com/styles/stamen_toner_lite.json", {
      as: "fetch",
      crossOrigin: "anonymous",
    });
  }

  const { t, i18n } = useTranslation(),
    { backgroundStyleID, year } = useUrlFragmentContext(),
    { showSnackbar } = useSnackbarContext(),
    [mapStyle, setMapStyle] = useState<StyleSpecification>(),
    style = useMemo(
      () =>
        BACKGROUND_STYLES.find((style) => style.id === backgroundStyleID) ??
        BACKGROUND_STYLES[0],
      [backgroundStyleID]
    ),
    [projectionID, setProjectionID] = useState<string>(DEFAULT_PROJECTION),
    [fetchedJsonStyleSpec, setFetchedJsonStyleSpec] = useState<{ id: string; spec: string }>();

  /**
   * Fetch the Maplibre style specification JSON whenever the selected style is changed
   */
  useEffect(() => {
    if (!BACKGROUND_STYLES?.length) {
      console.error("No background styles available");
    } else if (style) {
      console.debug("Fetching style", style);
      fetch(style.styleUrl)
        .then((resp) => resp.text())
        .then((json) => setFetchedJsonStyleSpec({ id: style.id, spec: json }))
        .catch((e) => {
          console.error("Failed fetching json style", e);
          showSnackbar(t("snackbar.map_error"));
        });
    }
  }, [showSnackbar, style, t]);

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
        if (styleSpec.glyphs)
          styleSpec.glyphs = styleSpec.glyphs.replace(style.keyPlaceholder, style.key);

        if (Array.isArray(styleSpec.sprite))
          styleSpec.sprite.forEach((s) =>
            s.url = s.url.replace(style.keyPlaceholder!, style.key!)
          );

        Object.values(styleSpec.sources)
          .filter((src) => src.type === "vector")
          .forEach((src) => {
            if (src.url) src.url = src.url.replace(style.keyPlaceholder!, style.key!);
            else delete src.url;

            if (src.tiles) {
              for (let i = 0; i < src.tiles.length; i++)
                src.tiles[i] = src.tiles[i].replace(style.keyPlaceholder!, style.key!);
            }
          });
        console.debug("Applied style key", {
          placeholder: style?.keyPlaceholder,
          key: style.key,
          styleSpec,
        });
      }

      if (style?.canFilterByDate) {
        const mapYear = isNaN(year) ? new Date().getFullYear() : year;
        /**
         * Filter the features by date, where applicable
         *
         * @see https://wiki.openstreetmap.org/wiki/OpenHistoricalMap/Reuse#Vector_tiles_and_stylesheets
         */
        const startFilter: ExpressionSpecification = [
          "any",
          ["!", ["has", "start_date"]],
          [">=", mapYear, ["get", "start_decdate"]],
        ];
        const endFilter: ExpressionSpecification = [
          "any",
          ["!", ["has", "end_date"]],
          ["<", mapYear, ["get", "end_decdate"]],
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

      if (!styleSpec.projection?.type) styleSpec.projection = undefined; // Prevent errors with Mapbox styles

      // https://github.com/mapbox/mapbox-gl-js/issues/4808
      // styleSpec.glyphs = "http://fonts.openmaptiles.org/{fontstack}/{range}.pbf";
    },
    [i18n.language, style, year]
  );

  /**
   * Parse the fetched JSON style specification, update it with local settings and use it for the map
   */
  useEffect(() => {
    if (!fetchedJsonStyleSpec) {
      console.debug("Waiting for background style spec to be fetched");
      return;
    }

    if (fetchedJsonStyleSpec.id !== backgroundStyleID) {
      console.debug("Ignoring wrong background style", {
        backgroundStyleID,
        setJsonStyleSpec: setFetchedJsonStyleSpec,
      });
      return;
    }

    try {
      const styleSpec = JSON.parse(fetchedJsonStyleSpec.spec) as StyleSpecification;
      updateStyleSpec(styleSpec);
      console.debug("Setting json style", styleSpec);
      setMapStyle((old) => {
        if (old?.projection?.type)
          return { ...styleSpec, projection: { type: old.projection.type } };
        else return styleSpec;
      });
    } catch (e) {
      console.error("Failed parsing and applying json style specification", {
        jsonStyleSpec: fetchedJsonStyleSpec,
        e,
      });
      showSnackbar(t("snackbar.map_error"));
    }
  }, [backgroundStyleID, fetchedJsonStyleSpec, setMapStyle, showSnackbar, t, updateStyleSpec]);

  useEffect(() => {
    setMapStyle((old) => {
      if (!old) return old;
      else return { ...old, projection: { type: projectionID } };
    });
  }, [projectionID, setMapStyle]);

  const requestTransformFunction: RequestTransformFunction = useCallback(
    (url, resourceType) => {
      if (process.env.NEXT_PUBLIC_OWMF_mapbox_token && isMapboxURL(url)) {
        return transformMapboxUrl(
          url,
          resourceType as string,
          process.env.NEXT_PUBLIC_OWMF_mapbox_token
        );
      }

      if (url.includes("localhost")) url = url.replace("http", "https");

      return { url };
    },
    []
  );

  return (
    <BackgroundStyleContext.Provider
      value={{ style, mapStyle, requestTransformFunction, projectionID, setProjectionID }}
    >
      {children}
    </BackgroundStyleContext.Provider>
  );
};
