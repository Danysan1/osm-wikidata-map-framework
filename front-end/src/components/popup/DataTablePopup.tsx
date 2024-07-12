import { EtymologyFeature } from "@/src/model/EtymologyResponse";
import { Popup as PopupRef } from "maplibre-gl";
import { FC, useEffect, useRef } from "react";
import { LngLat, Popup } from "react-map-gl/maplibre";
import { DataTable } from "../DataTable/DataTable";
import styles from "./popup.module.css";

interface DataTablePopupProps {
  features: EtymologyFeature[];
  position: LngLat;
  onClose: () => void;
  setOpenFeature: (feature: EtymologyFeature) => void;
}

export const DataTablePopup: FC<DataTablePopupProps> = (props) => {
  const popupRef = useRef<PopupRef>(null);

  useEffect(
    () => popupRef.current?.getElement()?.querySelector(".maplibregl-popup-close-button")?.scrollIntoView(true),
    [popupRef, props.features]
  );

  return <Popup longitude={props.position.lng}
    latitude={props.position.lat}
    className={styles.custom_popup}
    maxWidth="none"
    closeButton
    closeOnClick
    closeOnMove
    onClose={props.onClose}
    ref={popupRef}
  >
    <DataTable features={props.features} setOpenFeature={props.setOpenFeature} />
  </Popup>
}