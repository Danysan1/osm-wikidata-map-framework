import { OwmfFeature } from "@/src/model/OwmfResponse";
import { FC } from "react";
import { LngLat, Popup } from "react-map-gl/maplibre";
import { DataTable } from "../DataTable/DataTable";
import styles from "./popup.module.css";

interface DataTablePopupProps {
  features: OwmfFeature[];
  position: LngLat;
  onClose: () => void;
  setOpenFeature: (feature: OwmfFeature) => void;
}

export const DataTablePopup: FC<DataTablePopupProps> = (props) => {
  return <Popup longitude={props.position.lng}
    latitude={props.position.lat}
    className={styles.custom_popup}
    maxWidth="none"
    closeButton
    closeOnClick
    closeOnMove
    onClose={props.onClose}
    anchor="top-left"
  >
    <DataTable features={props.features} setOpenFeature={props.setOpenFeature} />
  </Popup>
}