import { t } from "i18next";
import type { ControlPosition, IControl, Map } from "maplibre-gl";
import { FC, cloneElement, useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useControl } from "react-map-gl/maplibre";
import { InfoPopup } from "../../InfoPopup/InfoPopup";

class InfoControlObject implements IControl {
  private _map?: Map;
  private _container?: HTMLElement;

  onAdd(map: Map) {
    this._map = map;
    this._container = document.createElement("div");
    this._container.className =
      "maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group custom-ctrl info-ctrl";
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

interface InfoControlProps {
  position?: ControlPosition;
  className?: string;
}

export const InfoControl: FC<InfoControlProps> = (props) => {
  const [isPopupOpen, setPopupOpen] = useState(true),
    openPopup = useCallback(() => setPopupOpen(true), []),
    closePopup = useCallback(() => setPopupOpen(false), []);

  const ctrl = useControl<InfoControlObject>(() => new InfoControlObject(), {
    position: props.position,
  });

  const map = ctrl.getMap(),
    container = ctrl.getContainer();
  const element = useMemo(
    () => (
      <div className={props.className}>
        <button
          className="info-ctrl-button mapboxgl-ctrl-icon maplibregl-ctrl-icon"
          onClick={openPopup}
          title={t("info_box.open_popup")}
          aria-label={t("info_box.open_popup")}
        >
          ℹ️
        </button>
        {isPopupOpen && map && (
          <InfoPopup position={map.getBounds().getSouthWest()} onClose={closePopup} />
        )}
      </div>
    ),
    [props.className, openPopup, isPopupOpen, map, closePopup]
  );

  return (
    element && map && container && createPortal(cloneElement(element, { map }), container)
  );
};
