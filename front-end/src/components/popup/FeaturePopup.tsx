import { Popup as PopupRef } from "maplibre-gl";
import { FC, useEffect, useRef } from "react";
import { Popup, useMap } from "react-map-gl/maplibre";
import { EtymologyFeature } from "../../model/EtymologyResponse";
import { FeatureView } from "../FeatureView/FeatureView";
import styles from "./popup.module.css";

interface FeaturePopupProps {
  feature: EtymologyFeature;
  onClose: () => void;
}

export const FeaturePopup: FC<FeaturePopupProps> = ({ feature, onClose }) => {
  const { current: map } = useMap(),
    popupRef = useRef<PopupRef>(null),
    position = map?.getBounds()?.getSouthWest(); // No useMemo is correct, the coordinates change over time
  if (process.env.NODE_ENV === "development") console.debug(
    "FeaturePopup", { feature, position }
  );

  useEffect(
    () => popupRef.current?.getElement()?.querySelector(".maplibregl-popup-close-button")?.scrollIntoView(true),
    [popupRef]
  );

  return (
    position && (
      <Popup
        longitude={position.lng}
        latitude={position.lat}
        className={styles.custom_popup}
        maxWidth="none"
        closeButton
        closeOnClick
        closeOnMove
        onClose={onClose}
        ref={popupRef}
      >
        <FeatureView feature={feature} />
      </Popup>
    )
  );
};
