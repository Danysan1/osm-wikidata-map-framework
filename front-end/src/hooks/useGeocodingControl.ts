import { parseBoolConfig } from '@/src/config';
import { GeocodingControl } from '@maptiler/geocoding-control/maplibregl';
import { MapLibreSearchControl } from '@stadiamaps/maplibre-search-box';
import type { ControlPosition } from 'maplibre-gl';
import { useControl } from 'react-map-gl/maplibre';

interface GeocodingControlProps {
  position?: ControlPosition;
}

export const useGeocodingControl = (props: GeocodingControlProps) => {
  const maptiler_key = process.env.owmf_maptiler_key;
  useControl<GeocodingControl | MapLibreSearchControl>(() => {
    if (maptiler_key) {
      return new GeocodingControl({
        apiKey: maptiler_key,
        collapsed: true,
        marker: false, // Markers require to pass maplibregl as argument
      });
    } else if (parseBoolConfig("enable_stadia_maps")) {
      return new MapLibreSearchControl({});
    } else {
      throw new Error('Maptiler or Stadia Maps are required to use GeocodingControl');
    }
  }, { position: props.position });
}
