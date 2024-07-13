import { GeocodingControl } from '@maptiler/geocoding-control/maplibregl';
import "@maptiler/geocoding-control/style.css";
import { MapLibreSearchControl } from '@stadiamaps/maplibre-search-box';
import "@stadiamaps/maplibre-search-box/dist/style.css";
import type { ControlPosition } from 'maplibre-gl';
import { FC, useEffect } from 'react';
import { useControl } from 'react-map-gl/maplibre';

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
  const maptiler_key = process.env.owmf_maptiler_key;
  const ctrl = useControl<GeocodingControl | MapLibreSearchControl>(() => {
    if (maptiler_key) {
      return new GeocodingControl({
        apiKey: maptiler_key,
        collapsed: true,
        marker: false, // Markers require to pass maplibregl as argument
      });
    } else if (process.env.owmf_enable_stadia_maps) {
      return new MapLibreSearchControl({});
    } else {
      throw new Error('Maptiler or Stadia Maps are required to use GeocodingControl');
    }
  }, { position: props.position });

  useEffect(() => {
    const focusOnGeocoder = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) &&
        e.key === "f" &&
        document.getElementsByClassName("owmf_data_table").length === 0 &&
        document.getElementsByClassName("detail_container").length === 0) {
        if (ctrl instanceof GeocodingControl)
          ctrl.focus();
        else
          ctrl.onClear();
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", focusOnGeocoder);
    return () => document.removeEventListener("keydown", focusOnGeocoder);
  }, [ctrl]);

  return null;
}
