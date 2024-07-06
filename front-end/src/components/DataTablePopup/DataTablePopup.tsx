import { EtymologyFeature } from "@/src/model/EtymologyResponse";
import { FC } from "react";
import { LngLat, Popup } from "react-map-gl/maplibre";
import { DataTable } from "../DataTable/DataTable";
import styles from "./DataTablePopup.module.css";

interface DataTablePopupProps {
    features: EtymologyFeature[];
    position: LngLat;
    onClose: () => void;
}

export const DataTablePopup: FC<DataTablePopupProps> = (props) => {
    return <Popup longitude={props.position.lng}
        latitude={props.position.lat}
        className={styles.data_table_popup}
        maxWidth="none"
        closeButton
        closeOnClick
        closeOnMove
        onClose={props.onClose}>
        <DataTable features={props.features} />
    </Popup>
}