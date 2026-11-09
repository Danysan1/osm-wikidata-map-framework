// import { GeocodingControl } from '@maptiler/geocoding-control/maplibregl';
import { MapLibreSearchControl } from "@stadiamaps/maplibre-search-box";
import "@stadiamaps/maplibre-search-box/dist/maplibre-search-box.css";
import { FC, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ControlPosition, useControl } from 'react-map-gl/maplibre';

interface OwmfGeocodingControlProps {
  position?: ControlPosition;
}

/**
 * Wrapper for Maptiler/Stadia Geocoding control.
 * Listens for Ctrl/Cmd + F to focus the geocoder.
 * 
 * @see https://www.npmjs.com/package/@maptiler/geocoding-control
 * @see https://docs.stadiamaps.com/sdks/maplibre-gl-js-autocomplete-search-plugin/
 * @see https://maplibre.org/maplibre-gl-js-docs/example/geocoder/
 * @see https://github.com/maplibre/maplibre-gl-geocoder
 * @see https://docs.mapbox.com/mapbox-gl-js/example/mapbox-gl-geocoder/
 */
export const OwmfGeocodingControl: FC<OwmfGeocodingControlProps> = (props) => {
  const { i18n } = useTranslation();

  /*  const ctrl = useControl<GeocodingControl>(() => new GeocodingControl({
      apiKey: process.env.NEXT_PUBLIC_OWMF_maptiler_key!,
    }), { position: props.position }),
    focus = ctrl.focus;

  useEffect(() => {
    ctrl.setOptions({
      apiKey: process.env.NEXT_PUBLIC_OWMF_maptiler_key!,
      language: i18n.language,
      collapsed: true,
    });
  }, [ctrl, i18n.language]);*/

  // https://docs.stadiamaps.com/sdks/maplibre-gl-js-autocomplete-search-plugin/
  const ctrl = useControl<MapLibreSearchControl>(() => new MapLibreSearchControl({
    lang: i18n.language,
  }), { position: props.position }),
    focus = useCallback(() => ctrl.getContainer()?.querySelector("input")?.focus(), [ctrl]);

  useEffect(() => {
    const focusOnGeocoder = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) &&
        e.key === "f" &&
        document.getElementsByClassName("owmf_data_table").length === 0 &&
        document.getElementsByClassName("detail_container").length === 0) {
        console.debug("OwmfGeocodingControl: focusing on geocoder");
        focus();
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", focusOnGeocoder);
    return () => document.removeEventListener("keydown", focusOnGeocoder);
  }, [focus]);

  return null;
}
