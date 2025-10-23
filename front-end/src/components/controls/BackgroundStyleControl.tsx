import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import { BACKGROUND_STYLES } from "@/src/model/backgroundStyle";
import { FC, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ControlPosition } from "react-map-gl/maplibre";
import { DropdownControl } from "./DropdownControl/DropdownControl";

interface BackgroundStyleControlProps {
  position?: ControlPosition;
}

/**
 * Let the user choose the background style from a list of styles.
 **/
export const BackgroundStyleControl: FC<BackgroundStyleControlProps> = ({ position }) => {
  const { t } = useTranslation(),
    { backgroundStyleID, setBackgroundStyleID } = useUrlFragmentContext(),
    dropdownItems = useMemo(
      () =>
        BACKGROUND_STYLES.map((style) => ({
          id: style.id,
          category: style.vendorText,
          text: style.styleText,
          onSelect: () => setBackgroundStyleID(style.id),
        })),
      [setBackgroundStyleID]
    );

  return (
    !!dropdownItems.length && (
      <DropdownControl
        buttonContent="🌍"
        dropdownItems={dropdownItems}
        selectedValue={backgroundStyleID}
        title={t("choose_basemap")}
        position={position}
        className="background-style-ctrl"
      />
    )
  );
};
