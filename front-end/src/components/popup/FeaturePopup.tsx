import { FC } from "react";
import { Popup, useMap } from "react-map-gl/maplibre";
import { OwmfFeature } from "../../model/OwmfResponse";
import { FeatureView } from "../FeatureView/FeatureView";
import styles from "./popup.module.css";

interface FeaturePopupProps {
  feature: OwmfFeature;
  onClose: () => void;
}

export const FeaturePopup: FC<FeaturePopupProps> = ({ feature, onClose }) => {
  const { current: map } = useMap(),
    position = map?.getBounds()?.getNorthWest(); // No useMemo is correct, the coordinates change over time
  if (process.env.NODE_ENV === "development") console.debug(
    "FeaturePopup", { feature, position }
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
        anchor="top-left"
      >
        <FeatureView feature={feature} />
      </Popup>
    )
  );
};
