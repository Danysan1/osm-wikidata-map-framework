import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import type { ControlPosition, IControl, Map, MapSourceDataEvent } from "maplibre-gl";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import Image from "next/image";
import { FC, cloneElement, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useControl } from "react-map-gl/maplibre";
import styles from "./LinkControl.module.css";

class LinkControlObject implements IControl {
  private _map?: Map;
  private _container?: HTMLElement;
  private _onSourceData?: (e: MapSourceDataEvent) => void;

  constructor(onSourceData?: (e: MapSourceDataEvent) => void) {
    this._onSourceData = onSourceData;
  }

  onAdd(map: Map) {
    this._map = map;
    if (this._onSourceData) map.on("sourcedata", this._onSourceData);
    this._container = document.createElement("div");
    this._container.className = `maplibregl-ctrl maplibregl-ctrl-group ${styles.control}`;
    return this._container;
  }

  onRemove() {
    this._container?.remove();
    this._container = undefined;
    if (this._onSourceData) {
      this._map?.off("sourcedata", this._onSourceData);
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
  icon: string | StaticImport;
  title: string;
  minZoomLevel?: number;
  position?: ControlPosition;
  className?: string;
  onSourceData?: (e: MapSourceDataEvent) => void;
}

/**
 * Let the user open a link.
 *
 * Control implemented as ES6 class and integrated in React through createPortal()
 * @see https://maplibre.org/maplibre-gl-js/docs/API/interfaces/IControl/
 * @see https://docs.mapbox.com/mapbox-gl-js/api/markers/#icontrol
 * @see https://react.dev/reference/react-dom/createPortal
 * @see https://github.com/visgl/react-map-gl/blob/7.0-release/examples/custom-overlay/src/custom-overlay.tsx
 */
export const LinkControl: FC<LinkControlProps> = (props) => {
  const { zoom } = useUrlFragmentContext();

  const ctrl = useControl<LinkControlObject>(
    () => {
      return new LinkControlObject(props.onSourceData);
    },
    { position: props.position }
  );

  const visible = useMemo(
    () =>
      !!props.linkURL && (props.minZoomLevel === undefined || zoom >= props.minZoomLevel),
    [props.linkURL, props.minZoomLevel, zoom]
  );
  const openLink = useCallback(() => window.open(props.linkURL), [props.linkURL]);
  const element = useMemo(
    () =>
      visible ? (
        <div className={props.className}>
          <button title={props.title} aria-label={props.title} onClick={openLink} className={styles.button}>
            <Image
              className="button_img"
              alt={props.title + " logo"}
              src={props.icon}
              loading="lazy"
              width={23}
              height={23}
            />
          </button>
        </div>
      ) : null,
    [openLink, props.className, props.icon, props.title, visible]
  );

  const map = ctrl.getMap(),
    container = ctrl.getContainer();
  return (
    element && map && container && createPortal(cloneElement(element, { map }), container)
  );
};
