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

const LONGITUDE_POSITION = 0,
  LATITUDE_POSITION = 1,
  ZOOM_POSITION = 2,
  COLOR_SCHEME_POSITION = 3,
  BACK_END_POSITION = 4,
  BACKGROUND_STYLE_POSITION = 5,
  PRESET_POSITION = 6,
  YEAR_POSITION = 7,
  DEFAULT_LATITUDE = process.env.owmf_default_center_lat ? parseFloat(process.env.owmf_default_center_lat) : 0,
  DEFAULT_LONGITUDE = process.env.owmf_default_center_lon ? parseFloat(process.env.owmf_default_center_lon) : 0,
  DEFAULT_ZOOM = process.env.owmf_default_zoom ? parseInt(process.env.owmf_default_zoom) : 1,
  DEFAULT_COLOR_SCHEME = process.env.owmf_default_color_scheme && Object.values(ColorSchemeID).includes(process.env.owmf_default_color_scheme as ColorSchemeID) ? process.env.owmf_default_color_scheme as ColorSchemeID : ColorSchemeID.blue,
  DEFAULT_BACKEND_ID = "pmtiles_all",
  DEFAULT_BACKGROUND_STYLE_ID = process.env.owmf_default_background_style ?? "stadia_alidade",
  DEFAULT_YEAR = new Date().getFullYear();

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
  year: number;
  setYear: (date: number) => void;
}
function readLatitudeFromFragment(splitFragment: string[]) {
  const rawLat = splitFragment[LATITUDE_POSITION];
  return rawLat && !isNaN(parseFloat(rawLat)) ? parseFloat(rawLat) : undefined;
}
function readLongitudeFromFragment(splitFragment: string[]) {
  const rawLon = splitFragment[LONGITUDE_POSITION];
  return rawLon && !isNaN(parseFloat(rawLon)) ? parseFloat(rawLon) : undefined;
}
function readZoomFromFragment(splitFragment: string[]) {
  const rawZoom = splitFragment[ZOOM_POSITION];
  return rawZoom && !isNaN(parseFloat(rawZoom)) ? parseFloat(rawZoom) : undefined;
}
function readColorSchemeIdFromFragment(splitFragment: string[]) {
  const rawID = splitFragment[COLOR_SCHEME_POSITION];
  if (rawID && Object.values(ColorSchemeID).includes(rawID as ColorSchemeID)) {
    return rawID as ColorSchemeID;
  } else {
    console.warn("Invalid color scheme in URL fragment", rawID);
    return undefined;
  }
}
function readBackEndIdFromFragment(splitFragment: string[]) {
  return splitFragment[BACK_END_POSITION];
}
function readBackgroundStyleIdFromFragment(splitFragment: string[]) {
  const rawFragmentID = splitFragment[BACKGROUND_STYLE_POSITION],
    rawQueryID = window.location.search ? new URLSearchParams(window.location.search).get("style") : undefined;
  return rawFragmentID ?? rawQueryID;
}
function readYearFromFragment(splitFragment: string[]) {
  const rawYear = splitFragment[YEAR_POSITION];
  return !rawYear || isNaN(parseInt(rawYear)) ? undefined : parseInt(rawYear);
}
function readSourcePresetIdFromFragment(splitFragment: string[]) {
  const rawID = splitFragment[PRESET_POSITION];
  if (rawID && getActiveSourcePresetIDs().includes(rawID)) {
    return rawID;
  } else {
    console.warn("Invalid or empty source preset in URL fragment", rawID);
    return undefined;
  }
}

const UrlFragmentContext = createContext<UrlFragmentState>({
  lon: DEFAULT_LONGITUDE,
  setLon: () => {
    /* placeholder */
  },
  lat: DEFAULT_LATITUDE,
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
  year: DEFAULT_YEAR,
  setYear: () => {
    /* placeholder */
  },
});

export const useUrlFragmentContext = () => useContext(UrlFragmentContext);

export const UrlFragmentContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const [initialized, setInitialized] = useState(false),
    [lat, _setLat] = useState<number>(DEFAULT_LATITUDE),
    [lon, setLon] = useState<number>(DEFAULT_LONGITUDE),
    [zoom, _setZoom] = useState<number>(DEFAULT_ZOOM),
    [colorSchemeID, setColorSchemeID] = useState<ColorSchemeID>(DEFAULT_COLOR_SCHEME),
    [backEndID, setBackEndID] = useState<string>(DEFAULT_BACKEND_ID),
    [backgroundStyleID, setBackgroundStyleID] = useState<string>(DEFAULT_BACKGROUND_STYLE_ID),
    [sourcePresetID, setSourcePresetID] = useState<string>(getActiveSourcePresetIDs()[0] ?? DEFAULT_SOURCE_PRESET_ID),
    [year, setYear] = useState<number>(DEFAULT_YEAR),
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
      newLat = readLatitudeFromFragment(split),
      newLon = readLongitudeFromFragment(split),
      newZoom = readZoomFromFragment(split),
      newColorScheme = readColorSchemeIdFromFragment(split),
      newBackEnd = readBackEndIdFromFragment(split),
      newBackgroundStyle = readBackgroundStyleIdFromFragment(split),
      newSourcePreset = readSourcePresetIdFromFragment(split),
      newYear = readYearFromFragment(split);

    if (newLat) setLat(newLat);
    if (newLon) setLon(newLon);
    if (newZoom) setZoom(newZoom);
    if (newColorScheme) setColorSchemeID(newColorScheme);
    if (newBackEnd) setBackEndID(newBackEnd);
    if (newBackgroundStyle) setBackgroundStyleID(newBackgroundStyle);
    if (newSourcePreset) setSourcePresetID(newSourcePreset);
    if (newYear) setYear(newYear);

    console.debug("UrlFragmentContextProvider: loaded fragment", {
      newLat,
      newLon,
      newZoom,
      newColorScheme,
      newBackEnd,
      newBackgroundStyle,
      newSourcePreset,
      newYear,
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

    const fragment = `#${strLon},${strLat},${strZoom},${colorSchemeID},${backEndID},${backgroundStyleID},${sourcePresetID},${year}`;
    if (window.location.hash !== fragment) {
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
        year,
      });
      window.location.hash = fragment;
    } else {
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
    year,
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
        year,
        setYear,
      }}
    >
      {children}
    </UrlFragmentContext.Provider>
  );
};
