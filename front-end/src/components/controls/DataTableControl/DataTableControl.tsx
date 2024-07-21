import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import dataTableIcon from "@/src/img/Simple_icon_table.svg";
import { EtymologyFeature } from "@/src/model/EtymologyResponse";
import type { ControlPosition, IControl, Map, MapSourceDataEvent } from "maplibre-gl";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import Image from "next/image";
import { FC, cloneElement, useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { LngLat, useControl } from "react-map-gl/maplibre";
import { DataTablePopup } from "../../popup/DataTablePopup";
import styles from "./DataTableControl.module.css";

class DataTableControlObject implements IControl {
  private _map?: Map;
  private _container?: HTMLElement;
  private _onSourceData?: (e: MapSourceDataEvent) => void;

  constructor(onSourceData?: (e: MapSourceDataEvent) => void) {
    this._onSourceData = onSourceData;
  }

  onAdd(map: Map) {
    this._map = map;
    if (this._onSourceData) {
      if (process.env.NODE_ENV === "development")
        console.debug("DataTableControlObject.onAdd: setting sourcedata");
      map.on("sourcedata", this._onSourceData);
    }
    this._container = document.createElement("div");
    this._container.className = `maplibregl-ctrl maplibregl-ctrl-group ${styles.control}`;
    return this._container;
  }

  onRemove() {
    this._container?.remove();
    this._container = undefined;
    /*if (this._onSourceData) {
      if (process.env.NODE_ENV === "development") console.debug("DataTableControlObject.onRemove: unsetting sourcedata");
      this._map?.off('sourcedata', this._onSourceData);
      this._onSourceData = undefined;
    }*/
    this._map = undefined;
  }

  getMap() {
    return this._map;
  }

  getContainer() {
    return this._container;
  }
}

interface DataTableControlProps {
  sourceID: string;
  dataLayerIDs: string[];
  minZoomLevel?: number;
  position?: ControlPosition;
  className?: string;
  setOpenFeature: (feature: EtymologyFeature) => void;
}

export const DataTableControl: FC<DataTableControlProps> = (props) => {
  const { zoom } = useUrlFragmentContext(),
    { t } = useTranslation(),
    [dataLoaded, setDataLoaded] = useState(false),
    onSourceData = useCallback(
      (e: MapSourceDataEvent) => {
        if (e.isSourceLoaded && e.dataType === "source" && props.sourceID === e.sourceId)
          setDataLoaded(true);
      },
      [props.sourceID]
    );

  const ctrl = useControl<DataTableControlObject>(
    () => {
      return new DataTableControlObject(onSourceData);
    },
    { position: props.position }
  );
  const map = ctrl.getMap(),
    container = ctrl.getContainer(),
    [popupPosition, setPopupPosition] = useState<LngLat>();

  const visible =
      dataLoaded && (props.minZoomLevel === undefined || zoom >= props.minZoomLevel),
    [tableFeatures, setTableFeatures] = useState<EtymologyFeature[] | undefined>(),
    openTable = useCallback(() => {
      setPopupPosition(map?.getBounds()?.getNorthWest());
      setTableFeatures(map?.queryRenderedFeatures({ layers: props.dataLayerIDs }));
    }, [map, props.dataLayerIDs]),
    closeTable = useCallback(() => {
      setPopupPosition(undefined);
      setTableFeatures(undefined);
    }, []);
  const element = useMemo(
    () =>
      visible && (
        <div className={props.className}>
          <button
            title={t("data_table.view_data_table")}
            aria-label={t("data_table.view_data_table")}
            onClick={openTable}
          >
            <Image
              className={styles.icon}
              alt={"Data table symbol"}
              src={dataTableIcon as StaticImport}
              loading="lazy"
              width={23}
              height={23}
            />
          </button>
          {tableFeatures && popupPosition && (
            <DataTablePopup
              features={tableFeatures}
              onClose={closeTable}
              position={popupPosition}
              setOpenFeature={props.setOpenFeature}
            />
          )}
        </div>
      ),
    [
      closeTable,
      openTable,
      popupPosition,
      props.className,
      props.setOpenFeature,
      t,
      tableFeatures,
      visible,
    ]
  );

  return (
    element && map && container && createPortal(cloneElement(element, { map }), container)
  );
};
