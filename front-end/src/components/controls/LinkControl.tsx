import { useUrlFragmentContext } from '@/src/context/UrlFragmentContext';
import type { IControl, Map, MapSourceDataEvent } from 'maplibre-gl';
import Image from 'next/image';
import { FC, cloneElement, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useControl } from 'react-map-gl/maplibre';

/**
 * Let the user open a link.
 * 
 * Control implemented as ES6 class and integrated in React through createPortal()
 * @see https://maplibre.org/maplibre-gl-js/docs/API/interfaces/IControl/
 * @see https://docs.mapbox.com/mapbox-gl-js/api/markers/#icontrol
 * @see https://react.dev/reference/react-dom/createPortal
 * @see https://github.com/visgl/react-map-gl/blob/7.0-release/examples/custom-overlay/src/custom-overlay.tsx
 */
class LinkControlObject implements IControl {
  private _map?: Map;
  private _container?: HTMLElement;
  private _onSourceData?: (e: MapSourceDataEvent) => void;

  constructor(onSourceData?: (e: MapSourceDataEvent) => void) {
    this._onSourceData = onSourceData;
  }

  onAdd(map: Map) {
    this._map = map;
    if (this._onSourceData) map.on('sourcedata', this._onSourceData);
    this._container = document.createElement('div');
    return this._container;
  }

  onRemove() {
    this._container?.remove();
    this._container = undefined;
    if (this._onSourceData) {
      this._map?.off('sourcedata', this._onSourceData);
      this._onSourceData = undefined;
    }
    this._map = undefined;
  }

  getMap() {
    return this._map;
  }

  getContainer() {
    return this._container;
  }
}

interface LinkControlProps {
  linkURL?: string;
  iconURL: string;
  title: string;
  minZoomLevel?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
  onSourceData?: (e: MapSourceDataEvent) => void;
}

export const LinkControl: FC<LinkControlProps> = (props) => {
  const { zoom } = useUrlFragmentContext();

  const ctrl = useControl<LinkControlObject>(() => {
    return new LinkControlObject(props.onSourceData);
  }, { position: props.position });

  const map = ctrl.getMap(),
    container = ctrl.getContainer();
  const visible = useMemo(
    () => !!props.linkURL && (props.minZoomLevel === undefined || zoom >= props.minZoomLevel),
    [props.linkURL, props.minZoomLevel, zoom]
  );
  const openLink = useCallback(() => window.open(props.linkURL), [props.linkURL]);
  const element = useMemo(() =>
    visible ? <div className={`maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl link-ctrl ${props.className} ${visible ? '' : 'hiddenElement'}`}>
      <button title={props.title} aria-label={props.title} onClick={openLink}>
        <Image className="button_img" alt={props.title + " logo"} src={props.iconURL} loading="lazy" width={23} height={23} />
      </button>
    </div> : null,
    [openLink, props.className, props.iconURL, props.title, visible]);

  return element && map && container && createPortal(cloneElement(element, { map }), container);
}
