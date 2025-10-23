import { useBackgroundStyleContext } from "@/src/context/BackgroundStyleContext";
import { FC, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ControlPosition } from "react-map-gl/maplibre";
import { DropdownControl, DropdownItem } from "./DropdownControl/DropdownControl";

export interface Projection {
  id: string;
  text: string;
}

const PROJECTIONS: Projection[] = [
  { id: "mercator", text: "Web Mercator" }, // https://en.wikipedia.org/wiki/Web_Mercator_projection
  // { id: "equirectangular", text: "Equirectangular" }, // https://en.wikipedia.org/wiki/Equirectangular_projection , only supported by Mapbox GL JS
  // { id: "equalEarth", text: "Equal Earth" }, // https://en.wikipedia.org/wiki/Equal_Earth_projection , only supported by Mapbox GL JS
  // { id: "naturalEarth", text: "Natural Earth" }, // https://en.wikipedia.org/wiki/Natural_Earth_projection , only supported by Mapbox GL JS
  // { id: "winkelTripel", text: "Winkel tripel" }, // https://en.wikipedia.org/wiki/Winkel_tripel_projection , only supported by Mapbox GL JS
  { id: "globe", text: "Globe" },
];

interface ProjectionControlProps {
  position?: ControlPosition;
}

/**
 * Let the user choose the map projection.
 *
 * @see https://maplibre.org/roadmap/globe-view/
 * @see https://github.com/maplibre/maplibre/discussions/161
 * @see https://docs.mapbox.com/mapbox-gl-js/guides/projections/
 * @see https://docs.mapbox.com/mapbox-gl-js/example/projections/
 **/
export const ProjectionControl: FC<ProjectionControlProps> = ({ position }) => {
  const { projectionID, setProjectionID } = useBackgroundStyleContext(),
    { t } = useTranslation(),
    dropdownItems = useMemo(
      () =>
        PROJECTIONS.map<DropdownItem>((projection) => ({
          id: projection.id,
          text: projection.text,
          onSelect: () => setProjectionID(projection.id),
        })),
      [setProjectionID]
    );

  return (
    <DropdownControl
      buttonContent="🌐"
      dropdownItems={dropdownItems}
      selectedValue={projectionID}
      title={t("choose_projection", "Choose map projection")}
      position={position}
      className="projection-ctrl"
    />
  );
};
