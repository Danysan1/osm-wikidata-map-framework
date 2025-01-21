import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import dataTableIcon from "@/src/img/Simple_icon_table.svg";
import { OwmfFeature } from "@/src/model/OwmfResponse";
import { Map } from "maplibre-gl";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import Image from "next/image";
import { FC, cloneElement, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { ControlPosition, IControl, LngLat, MapInstance, MapSourceDataEvent, useControl } from "react-map-gl/maplibre";
import { DataTablePopup } from "../popup/DataTablePopup";
import styles from "./control.module.css";

class DataTableControlObject implements IControl {
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

interface DataTableControlProps {
  sourceID: string;
  dataLayerIDs: string[];
  minZoomLevel?: number;
  position?: ControlPosition;
  className?: string;
  setOpenFeature: (feature: OwmfFeature) => void;
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
    () => new DataTableControlObject(),
    { position: props.position }
  );
  const map = ctrl.getMap(),
    container = ctrl.getContainer(),
    [popupPosition, setPopupPosition] = useState<LngLat>();

  const visible =
    dataLoaded && (props.minZoomLevel === undefined || zoom >= props.minZoomLevel),
    [tableFeatures, setTableFeatures] = useState<OwmfFeature[] | undefined>(),
    openTable = useCallback(() => {
      setPopupPosition((map as Map)?.getBounds()?.getNorthWest());
      setTableFeatures(map?.queryRenderedFeatures({ layers: props.dataLayerIDs }));
    }, [map, props.dataLayerIDs]),
    closeTable = useCallback(() => {
      setPopupPosition(undefined);
      setTableFeatures(undefined);
    }, []);
  const element = useMemo(
    () =>
      visible && (
        <div className={`${styles.control} ${props.className}`}>
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


  useEffect(() => {
    if (onSourceData) {
      console.debug("DataTableControl: setting sourcedata");
      map?.on("sourcedata", onSourceData);
    }

    return () => {
      if (onSourceData) {
        console.debug("DataTableControl: unsetting sourcedata");
        map?.off("sourcedata", onSourceData);
      }
    };
  }, [map, onSourceData]);

  return (
    element && map && container && createPortal(cloneElement(element, { map }), container)
  );
};
