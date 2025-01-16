import {
  getFeatureLinkedEntities,
  getFeatureTags,
  OwmfFeature,
} from "@/src/model/OwmfResponse";
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
  const uniqueFeatures = useMemo(() => {
    if (process.env.owmf_deduplicate_data_table !== "true") {
      return features;
    } else {
      const uniqueMap = features.reduce<Record<string, OwmfFeature>>(
        (acc, feature, i) => {
          const signatures = [
            getFeatureTags(feature)?.name ?? feature.id ?? feature.properties?.id ?? i,
            ...getFeatureLinkedEntities(feature).map((e, i) => e.wikidata ?? e.name ?? i),
          ];
          acc[signatures.join("_")] = feature;
          return acc;
        },
        {}
      );
      console.debug("Calculated unique features", uniqueMap);
      return Object.values(uniqueMap);
    }
  }, [features]);

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
