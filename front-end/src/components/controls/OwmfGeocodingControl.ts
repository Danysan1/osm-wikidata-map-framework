import { GeocodingControl } from '@maptiler/geocoding-control/maplibregl';
import "@maptiler/geocoding-control/style.css";
import { FC, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ControlPosition, useControl } from 'react-map-gl/maplibre';

interface OwmfGeocodingControlProps {
  position?: ControlPosition;
}

/**
 * Geocoding control (from Maptiler if possible, Stadia Maps otherwise).
 * Listens for Ctrl/Cmd + F to focus the geocoder.
 * 
 * @see https://www.npmjs.com/package/@maptiler/geocoding-control
 * @see https://docs.stadiamaps.com/sdks/maplibre-gl-js-autocomplete-search-plugin/
 * @see https://maplibre.org/maplibre-gl-js-docs/example/geocoder/
 * @see https://github.com/maplibre/maplibre-gl-geocoder
 * @see https://docs.mapbox.com/mapbox-gl-js/example/mapbox-gl-geocoder/
 */
export const OwmfGeocodingControl: FC<OwmfGeocodingControlProps> = (props) => {
  if (!process.env.owmf_maptiler_key) throw new Error('Maptiler key is required to use GeocodingControl');

  const { i18n } = useTranslation();
  const ctrl = useControl<GeocodingControl>(() => new GeocodingControl({
      apiKey: process.env.owmf_maptiler_key!,
    }), { position: props.position });

  useEffect(() => {
    const focusOnGeocoder = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) &&
        e.key === "f" &&
        document.getElementsByClassName("owmf_data_table").length === 0 &&
        document.getElementsByClassName("detail_container").length === 0) {
        ctrl.focus();
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", focusOnGeocoder);
    return () => document.removeEventListener("keydown", focusOnGeocoder);
  }, [ctrl]);

  useEffect(() => {
    ctrl.setOptions({
      apiKey: process.env.owmf_maptiler_key!,
      language: i18n.language,
      collapsed: true,
    });
  }, [ctrl, i18n.language])

  return null;
}
