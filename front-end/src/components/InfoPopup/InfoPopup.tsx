import { FC } from "react";
import { LngLat, Popup } from "react-map-gl/maplibre";
import { InfoPanel } from "../InfoPanel/InfoPanel";
import styles from "./InfoPopup.module.css";

interface InfoPopupProps {
  position: LngLat;
  onClose: () => void;
}

export const InfoPopup: FC<InfoPopupProps> = (props) => {
  return (
    <Popup
      longitude={props.position.lng}
      latitude={props.position.lat}
      className={styles.info_popup}
      maxWidth="none"
      closeButton
      closeOnClick
      closeOnMove
      onClose={props.onClose}
    >
      <InfoPanel />
    </Popup>
  );
};
