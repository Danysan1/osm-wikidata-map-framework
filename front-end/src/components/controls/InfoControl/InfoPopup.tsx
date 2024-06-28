import { FC } from "react";
import { LngLat, Popup } from "react-map-gl/maplibre";
import { InfoPanel } from "./InfoPanel";
import styles from "./InfoPopup.module.css";

interface InfoPopupProps {
    lastUpdateDate?: string;
    className?: string;
    position: LngLat;
    onClose: () => void;
}

export const InfoPopup: FC<InfoPopupProps> = (props) => {
    return <Popup longitude={props.position.lng}
        latitude={props.position.lat}
        className={styles.owmf_info_popup + " " + props.className}
        maxWidth="none"
        closeButton
        closeOnClick
        closeOnMove
        onClose={props.onClose}>
        <InfoPanel lastUpdateDate={props.lastUpdateDate} />
    </Popup>
}