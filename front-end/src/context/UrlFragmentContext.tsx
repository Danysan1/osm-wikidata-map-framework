"use client";

import {
  Dispatch,
  FC,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ColorSchemeID } from "../model/colorScheme";
import { DEFAULT_SOURCE_PRESET_ID } from "../model/SourcePreset";
import { getActiveSourcePresetIDs } from "../SourcePreset/common";
import { parseStringArrayConfig } from "../config";

const LONGITUDE_POSITION = 0,
  LATITUDE_POSITION = 1,
  ZOOM_POSITION = 2,
  COLOR_SCHEME_POSITION = 3,
  BACK_END_POSITION = 4,
  BACKGROUND_STYLE_POSITION = 5,
  PRESET_POSITION = 6,
  DEFAULT_LATITUDE = 0,
  DEFAULT_LONGITUDE = 0,
  DEFAULT_ZOOM = 1,
  DEFAULT_COLOR_SCHEME = ColorSchemeID.blue,
  DEFAULT_BACKEND_ID = "overpass_all",
  DEFAULT_BACKGROUND_STYLE_ID = "stadia_alidade";

interface UrlFragmentState {
  lon: number;
  setLon: (lon: number) => void;
  lat: number;
  setLat: (lat: number) => void;
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  colorSchemeID: ColorSchemeID;
  setColorSchemeID: (colorScheme: ColorSchemeID) => void;
  backEndID: string;
  setBackEndID: (backEndID: string) => void;
  backgroundStyleID: string;
  setBackgroundStyleID: (backgroundStyleID: string) => void;
  sourcePresetID: string;
  setSourcePresetID: (sourcePresetID: string) => void;
}

const UrlFragmentContext = createContext<UrlFragmentState>({
  lon: DEFAULT_LATITUDE,
  setLon: () => {
    /* placeholder */
  },
  lat: DEFAULT_LONGITUDE,
  setLat: () => {
    /* placeholder */
  },
  zoom: DEFAULT_ZOOM,
  setZoom: () => {
    /* placeholder */
  },
  colorSchemeID: DEFAULT_COLOR_SCHEME,
  setColorSchemeID: () => {
    /* placeholder */
  },
  backEndID: DEFAULT_BACKEND_ID,
  setBackEndID: () => {
    /* placeholder */
  },
  backgroundStyleID: DEFAULT_BACKGROUND_STYLE_ID,
  setBackgroundStyleID: () => {
    /* placeholder */
  },
  sourcePresetID: DEFAULT_SOURCE_PRESET_ID,
  setSourcePresetID: () => {
    /* placeholder */
  },
});

export const useUrlFragmentContext = () => useContext(UrlFragmentContext);

export const UrlFragmentContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const [initialized, setInitialized] = useState(false),
    [lat, _setLat] = useState<number>(() => {
      const latFromConfig = process.env.owmf_default_center_lat
        ? parseFloat(process.env.owmf_default_center_lat)
        : undefined;
      return latFromConfig !== undefined && !isNaN(latFromConfig)
        ? latFromConfig
        : DEFAULT_LATITUDE;
    }),
    [lon, setLon] = useState<number>(() => {
      const lonFromConfig = process.env.owmf_default_center_lon
        ? parseFloat(process.env.owmf_default_center_lon)
        : undefined;
      return lonFromConfig !== undefined && !isNaN(lonFromConfig)
        ? lonFromConfig
        : DEFAULT_LONGITUDE;
    }),
    [zoom, _setZoom] = useState<number>(() => {
      const zoomFromConfig = process.env.owmf_default_zoom
        ? parseInt(process.env.owmf_default_zoom)
        : undefined;
      return zoomFromConfig !== undefined && !isNaN(zoomFromConfig)
        ? zoomFromConfig
        : DEFAULT_ZOOM;
    }),
    [colorSchemeID, setColorSchemeID] = useState<ColorSchemeID>(() => {
      const colorFromConfig = process.env.owmf_default_color_scheme as ColorSchemeID;
      return colorFromConfig && Object.values(ColorSchemeID).includes(colorFromConfig)
        ? colorFromConfig
        : DEFAULT_COLOR_SCHEME;
    }),
    [backEndID, setBackEndID] = useState<string>(() => {
      const preferredBackends = process.env.owmf_preferred_backends ? parseStringArrayConfig(process.env.owmf_preferred_backends) : [];
      return preferredBackends[0]?.length ? preferredBackends[0] : DEFAULT_BACKEND_ID;
    }),
    [backgroundStyleID, setBackgroundStyleID] = useState<string>(
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      () => process.env.owmf_default_background_style || DEFAULT_BACKGROUND_STYLE_ID
    ),
    [sourcePresetID, setSourcePresetID] = useState<string>(
      () => getActiveSourcePresetIDs()[0]
    ),
    setLat: Dispatch<SetStateAction<number>> = useCallback(
      (lat) => {
        if (typeof lat === "number" && (isNaN(lat) || lat < -90 || lat > 90))
          throw new Error(`Invalid latitude: ${lat}`);
        else _setLat(lat);
      },
      [_setLat]
    ),
    setZoom: Dispatch<SetStateAction<number>> = useCallback(
      (zoom) => {
        if (typeof zoom === "number" && (isNaN(zoom) || zoom < 0 || zoom > 20))
          throw new Error(`Invalid zoom: ${zoom}`);
        else _setZoom(zoom);
      },
      [_setZoom]
    );

  const updateStateFromFragment = useCallback(() => {
    const split = window.location.hash.replace("#", "").split(",") ?? [],
      latitudeFromFragment = split[LATITUDE_POSITION]
        ? parseFloat(split[LATITUDE_POSITION])
        : undefined,
      newLat =
        latitudeFromFragment !== undefined && !isNaN(latitudeFromFragment)
          ? latitudeFromFragment
          : undefined,
      longitudeFromFragment = split[LONGITUDE_POSITION]
        ? parseFloat(split[LONGITUDE_POSITION])
        : undefined,
      newLon =
        longitudeFromFragment !== undefined && !isNaN(longitudeFromFragment)
          ? longitudeFromFragment
          : undefined,
      zoomFromFragment = split[ZOOM_POSITION]
        ? parseFloat(split[ZOOM_POSITION])
        : undefined,
      newZoom =
        zoomFromFragment !== undefined && !isNaN(zoomFromFragment)
          ? zoomFromFragment
          : undefined;
    let newColorScheme: ColorSchemeID | undefined = split[COLOR_SCHEME_POSITION] as ColorSchemeID;
    if (!newColorScheme || !Object.values(ColorSchemeID).includes(newColorScheme)) {
      console.warn("Invalid or empty color scheme in URL fragment", newColorScheme);
      newColorScheme = undefined;
    }
    const newBackEnd = split[BACK_END_POSITION],
      backgroundStyleFromFragment = split[BACKGROUND_STYLE_POSITION],
      backgroundStyleFromQueryString = window.location.search
        ? new URLSearchParams(window.location.search).get("style")
        : null;
    let newSourcePreset: string | undefined = split[PRESET_POSITION];
    if (!newSourcePreset || !getActiveSourcePresetIDs().includes(newSourcePreset)) {
      console.warn("Invalid or empty source preset in URL fragment", newSourcePreset);
      newSourcePreset = undefined;
    }

    if (newLat) setLat(newLat);
    if (newLon) setLon(newLon);
    if (newZoom) setZoom(newZoom);
    if (newColorScheme) setColorSchemeID(newColorScheme);
    if (newBackEnd) setBackEndID(newBackEnd);
    if (newSourcePreset) setSourcePresetID(newSourcePreset);

    if (backgroundStyleFromFragment) setBackgroundStyleID(backgroundStyleFromFragment);
    else if (backgroundStyleFromQueryString)
      setBackgroundStyleID(backgroundStyleFromQueryString);

    if (process.env.NODE_ENV === "development")
      console.debug("UrlFragmentContextProvider: loaded fragment", {
        newLat,
        newLon,
        newZoom,
        newColorScheme,
        newBackEnd,
        backgroundStyleFromFragment,
        newSourcePreset,
      });
  }, [setLat, setZoom]);

  /** Load URL fragment on each fragment change */
  useEffect(() => {
    updateStateFromFragment();
    setInitialized(true);
    window.addEventListener("hashchange", updateStateFromFragment);
    return () => window.removeEventListener("hashchange", updateStateFromFragment);
  }, [updateStateFromFragment]);

  /** Update the URL fragment on state change */
  useEffect(() => {
    if (!initialized) return;

    const strLon = lon.toFixed(5),
      strLat = lat.toFixed(5),
      strZoom = zoom.toFixed(1);

    const fragment = `#${strLon},${strLat},${strZoom},${colorSchemeID},${backEndID},${backgroundStyleID},${sourcePresetID}`;
    if (window.location.hash !== fragment) {
      if (process.env.NODE_ENV === "development")
        console.debug("Updating fragment", {
          old: window.location.hash,
          new: fragment,
          lon,
          lat,
          zoom,
          colorSchemeID,
          backEndID,
          backgroundStyleID,
          sourcePresetID,
        });
      window.location.hash = fragment;
    } else {
      if (process.env.NODE_ENV === "development")
        console.debug("No fragment change necessary", {
          fragment,
          lon,
          lat,
          zoom,
          colorSchemeID,
          backEndID,
          backgroundStyleID,
          sourcePresetID,
        });
    }
  }, [
    backEndID,
    backgroundStyleID,
    colorSchemeID,
    initialized,
    lat,
    lon,
    sourcePresetID,
    zoom,
  ]);

  return (
    <UrlFragmentContext.Provider
      value={{
        lon,
        setLon,
        lat,
        setLat,
        zoom,
        setZoom,
        colorSchemeID,
        setColorSchemeID,
        backEndID,
        setBackEndID,
        backgroundStyleID,
        setBackgroundStyleID,
        sourcePresetID,
        setSourcePresetID,
      }}
    >
      {children}
    </UrlFragmentContext.Provider>
  );
};
