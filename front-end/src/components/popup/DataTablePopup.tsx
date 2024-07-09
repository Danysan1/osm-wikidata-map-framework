import { EtymologyFeature } from "@/src/model/EtymologyResponse";
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
  const headRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => headRef.current?.scrollIntoView(), [headRef]);

  return <Popup longitude={props.position.lng}
    latitude={props.position.lat}
    className={styles.custom_popup}
    maxWidth="none"
    closeButton
    closeOnClick
    closeOnMove
    onClose={props.onClose}
  >
    <a ref={headRef}></a>
    <DataTable features={props.features} setOpenFeature={props.setOpenFeature} />
  </Popup>
}