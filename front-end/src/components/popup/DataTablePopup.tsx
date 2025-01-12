import { OwmfFeature } from "@/src/model/OwmfResponse";
import { FC, useMemo } from "react";
import { LngLat, Popup } from "react-map-gl/maplibre";
import { DataTable } from "../DataTable/DataTable";
import styles from "./popup.module.css";

interface DataTablePopupProps {
  features: OwmfFeature[];
  position: LngLat;
  onClose: () => void;
  setOpenFeature: (feature: OwmfFeature) => void;
}

export const DataTablePopup: FC<DataTablePopupProps> = ({
  features,
  position,
  onClose,
  setOpenFeature,
}) => {
  const uniqueFeatures = useMemo(
    () =>
      Object.values(
        features.reduce<Record<string, OwmfFeature>>(
          (acc, feature, i) => ({
            ...acc,
            [feature.id ?? feature.properties?.id ?? i]: feature,
          }),
          {}
        )
      ),
    [features]
  );

  return (
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
      <DataTable features={uniqueFeatures} setOpenFeature={setOpenFeature} />
    </Popup>
  );
};
