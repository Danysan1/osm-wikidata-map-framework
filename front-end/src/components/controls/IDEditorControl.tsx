import { useUrlFragmentContext } from '@/src/context/UrlFragmentContext';
import iDEditorLogo from "@/src/img/OpenStreetMap-Editor_iD_Logo.svg";
import type { ControlPosition } from "maplibre-gl";
import { StaticImport } from 'next/dist/shared/lib/get-img-props';
import { FC, useMemo } from 'react';
import { LinkControl } from './LinkControl/LinkControl';

interface IDEditorControlProps {
  minZoomLevel: number;
  position?: ControlPosition;
}

/**
 * Let the user open the current view inside iD editor.
 * @see https://github.com/openstreetmap/iD
 */
export const IDEditorControl: FC<IDEditorControlProps> = (props) => {
  const { lon, lat, zoom } = useUrlFragmentContext(),
    url = useMemo(() => `https://www.openstreetmap.org/edit?editor=id#map=${zoom.toFixed()}/${lat}/${lon}`, [lat, lon, zoom]);

  return <LinkControl
    linkURL={url}
    icon={iDEditorLogo as StaticImport}
    title="iD editor"
    minZoomLevel={props.minZoomLevel}
    position={props.position}
    className='id-editor-ctrl' />;
}
