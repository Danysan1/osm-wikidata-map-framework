import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import Image from "next/image";
import { FC, cloneElement, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ControlPosition, IControl, MapInstance, MapSourceDataEvent, useControl } from "react-map-gl/maplibre";
import styles from "./LinkControl.module.css";

class LinkControlObject implements IControl {
  private _map?: MapInstance;
  private _container?: HTMLElement;

  onAdd(map: MapInstance) {
    this._map = map;
    this._container = document.createElement("div");
    this._container.className = `maplibregl-ctrl maplibregl-ctrl-group ${styles.control}`;
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

interface LinkControlProps {
  /** Link to redirect the user upon click */
  linkURL?: string;
  
  /** Icon to show inside the control */
  icon: string | StaticImport;

  /** Alt text to show on hover */
  title: string;

  /** Minimum zoom level to show the control */
  minZoomLevel?: number;

  /** Position of the control on the screen */
  position?: ControlPosition;

  /** Additional CSS class */
  className?: string;

  /** Callback to execute on each map SourceData event */
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
export const LinkControl: FC<LinkControlProps> = ({
  linkURL, title, icon, minZoomLevel, position, className, onSourceData
}) => {
  const { zoom } = useUrlFragmentContext();

  const ctrl = useControl<LinkControlObject>(
    () => new LinkControlObject(),
    { position: position }
  );

  const visible = useMemo(
    () =>
      !!linkURL && (minZoomLevel === undefined || zoom >= minZoomLevel),
    [linkURL, minZoomLevel, zoom]
  );
  const openLink = useCallback(() => window.open(linkURL), [linkURL]);
  const element = useMemo(
    () =>
      visible ? (
        <div className={className}>
          <button title={title} aria-label={title} onClick={openLink} className={styles.button}>
            <Image
              className={styles.icon}
              alt={title + " logo"}
              src={icon}
              loading="lazy"
              width={23}
              height={23}
            />
          </button>
        </div>
      ) : null,
    [openLink, className, icon, title, visible]
  );

  const map = ctrl.getMap(),
    container = ctrl.getContainer();

  useEffect(() => {
    if (onSourceData) {
      console.debug("LinkControl: setting sourcedata");
      map?.on("sourcedata", onSourceData);
    }

    return () => {
      if (onSourceData) {
        console.debug("LinkControl: unsetting sourcedata");
        map?.off("sourcedata", onSourceData);
      }
    };
  }, [map, onSourceData]);

  return (
    element && map && container && createPortal(cloneElement(element, { map }), container)
  );
};
