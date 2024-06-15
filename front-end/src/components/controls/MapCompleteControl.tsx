import { useUrlFragmentContext } from '@/src/context/UrlFragmentContext';
import { FC, useMemo } from 'react';
import { LinkControl } from './LinkControl';


interface MapCompleteControlProps {
  minZoomLevel: number;
  mapComplete_theme: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

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
