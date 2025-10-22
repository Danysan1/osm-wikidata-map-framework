import MaplibreInspect from '@maplibre/maplibre-gl-inspect';
import '@maplibre/maplibre-gl-inspect/dist/maplibre-gl-inspect.css';
import { Popup } from 'maplibre-gl';
import { FC } from 'react';
import { ControlPosition, useControl } from 'react-map-gl/maplibre';

interface InspectControlProps {
    position?: ControlPosition;
}

/**
 * @see https://maplibre.org/maplibre-gl-inspect/
 */
export const InspectControl: FC<InspectControlProps> = (props) => {
    useControl<MaplibreInspect>(() => new MaplibreInspect({
        popup: new Popup({
            closeButton: false,
            closeOnClick: false,
            maxWidth: '90em',
        })
    }), { position: props.position });

    return null;
}
