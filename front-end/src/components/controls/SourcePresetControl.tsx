import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import { getActiveSourcePresetIDs } from "@/src/SourcePreset/common";
import { ControlPosition } from "maplibre-gl";
import { FC, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";
import { DropdownControl } from "./DropdownControl/DropdownControl";

interface SourcePresetControlProps {
  position?: ControlPosition;
}

/**
 * Let the user choose the source preset from a list of presets.
 **/
export const SourcePresetControl: FC<SourcePresetControlProps> = ({ position }) => {
  const { t, i18n } = useTranslation(),
    { sourcePresetID, setSourcePresetID } = useUrlFragmentContext(),
    dropdownItems = useMemo(() => {
      return getActiveSourcePresetIDs().map((sourcePresetID) => ({
        id: sourcePresetID,
        text: t("preset." + sourcePresetID, sourcePresetID),
        onSelect: () => setSourcePresetID(sourcePresetID),
      }));
    }, [setSourcePresetID, t]);

  return (
    <DropdownControl
      checkMissingSelectedValue
      buttonContent="🗃️"
      dropdownItems={dropdownItems}
      selectedValue={sourcePresetID}
      title={t("preset.choose_preset")}
      position={position}
      className="preset-ctrl"
    >
      {sourcePresetID && sourcePresetID !== "base" && (
        <Button
          href={`/${i18n.language}/contributing/${sourcePresetID}#contribute_linked_entity`}
          text={t("etymology_details.more_details")}
          showText
          title={t("etymology_details.more_details")}
          iconText="ℹ️"
          iconAlt="Info symbol"
        />
      )}
    </DropdownControl>
  );
};
