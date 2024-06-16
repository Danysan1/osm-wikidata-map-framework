import { useUrlFragmentContext } from '@/src/context/UrlFragmentContext';
import { ControlPosition } from 'maplibre-gl';
import { FC, useMemo } from 'react';
import { LinkControl } from './LinkControl';

interface OsmWikidataMatcherControlProps {
  minZoomLevel: number;
  position?: ControlPosition;
}

/**
 * Let the user open the current view inside OSM <-> Wikidata matcher.
 * @see https://map.osm.wikidata.link/
 */
export const OsmWikidataMatcherControl: FC<OsmWikidataMatcherControlProps> = (props) => {
  const { lon, lat, zoom } = useUrlFragmentContext(),
    url = useMemo(() => `https://map.osm.wikidata.link/map/${zoom.toFixed()}/${lat}/${lon}`, [lat, lon, zoom]);

  return <LinkControl
    linkURL={url}
    iconURL="/img/osm-wd-matcher.png"
    title="OSM <-> Wikidata matcher"
    minZoomLevel={props.minZoomLevel}
    position={props.position}
    className='osm-wd-matcher-ctrl' />;
}
