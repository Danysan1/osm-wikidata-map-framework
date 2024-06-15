import { useUrlFragmentContext } from '@/src/context/UrlFragmentContext';
import type { IControl, Map } from 'maplibre-gl';
import Image from 'next/image';
import { FC, cloneElement, memo, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useControl } from 'react-map-gl/maplibre';

/**
 * Let the user open the current view inside MapComplete.
 * @see https://mapcomplete.org/
 * 
 * Control implemented as ES6 class and integrated in React through createPortal()
 * @see https://maplibre.org/maplibre-gl-js/docs/API/interfaces/IControl/
 * @see https://docs.mapbox.com/mapbox-gl-js/api/markers/#icontrol
 * @see https://react.dev/reference/react-dom/createPortal
 * @see https://github.com/visgl/react-map-gl/blob/7.0-release/examples/custom-overlay/src/custom-overlay.tsx
 */
class MapCompleteControl implements IControl {
  _map?: Map;
  _container?: HTMLElement;

  onAdd(map: Map) {
    this._map = map;
    this._container = document.createElement('div');
    return this._container;
  }

  onRemove() {
    this._container?.remove();
    this._container = undefined;
    this._map = undefined;
  }

  getMap() {
    return this._map;
  }

  getContainer() {
    return this._container;
  }
}

interface MapCompleteControlProps {
  minZoomLevel: number;
  mapComplete_theme: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const MapCompleteControlElement: FC<MapCompleteControlProps> = (props) => {
  const ctrl = useControl<MapCompleteControl>(() => {
    return new MapCompleteControl();
  }, { position: props.position });

  const map = ctrl.getMap(),
    container = ctrl.getContainer(),
    { lon, lat, zoom } = useUrlFragmentContext();
  const visible = useMemo(() => zoom >= props.minZoomLevel, [props.minZoomLevel, zoom]);
  const openMapComplete = useCallback(
    () => window.open(`https://mapcomplete.org/${props.mapComplete_theme}?z=${zoom}&lat=${lat}&lon=${lon}`),
    [lat, lon, props.mapComplete_theme, zoom]
  );
  const element = useMemo(() =>
    visible ? <div className={`maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl mapcomplete-ctrl ${visible ? '' : 'hidden'}`}>
      <button title="MapComplete" aria-label="MapComplete" onClick={openMapComplete}>
        <Image className="button_img" alt="Data table symbol" src="img/mapcomplete.svg" loading="lazy" width={23} height={23} />
      </button>
    </div> : <div></div>,
    [openMapComplete, visible]);

  return map && container && createPortal(cloneElement(element, { map }), container);
}

export default memo(MapCompleteControlElement);
