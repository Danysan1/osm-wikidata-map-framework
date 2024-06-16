import { useUrlFragmentContext } from '@/src/context/UrlFragmentContext';
import { ControlPosition } from 'maplibre-gl';
import { FC, useMemo } from 'react';
import { LinkControl } from './LinkControl';


interface MapCompleteControlProps {
  minZoomLevel: number;
  mapComplete_theme: string;
  position?: ControlPosition;
}

/**
 * Let the user open the current view inside MapComplete.
 * @see https://mapcomplete.org/
 */
export const MapCompleteControl: FC<MapCompleteControlProps> = (props) => {
  const { lon, lat, zoom } = useUrlFragmentContext();
  const url = useMemo(() => `https://mapcomplete.org/${props.mapComplete_theme}?z=${zoom}&lat=${lat}&lon=${lon}`, [lat, lon, props.mapComplete_theme, zoom]);

  return <LinkControl
    linkURL={url}
    iconURL="/img/mapcomplete.svg"
    title="MapComplete"
    minZoomLevel={props.minZoomLevel}
    position={props.position}
    className='mapcomplete-ctrl'
  />;
}
