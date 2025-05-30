import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import mapcompleteLogo from "@/src/img/mapcomplete.svg";
import { ControlPosition } from "maplibre-gl";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import { FC, useMemo } from "react";
import { LinkControl } from "./LinkControl";

interface MapCompleteControlProps {
  minZoomLevel: number;
  mapComplete_theme: string;
  position?: ControlPosition;
}

/**
 * Let the user open the current view inside MapComplete.
 * @see https://mapcomplete.org/
 */
export const MapCompleteControl: FC<MapCompleteControlProps> = (props) => {
  const { lon, lat, zoom, backEndID } = useUrlFragmentContext();
  const url = useMemo(
    () =>
      backEndID.includes("osm") || backEndID.includes("pmtiles")
        ? `https://mapcomplete.org/${props.mapComplete_theme}?z=${zoom}&lat=${lat}&lon=${lon}`
        : undefined,
    [backEndID, lat, lon, props.mapComplete_theme, zoom]
  );

  return (
    url && (
      <LinkControl
        linkURL={url}
        icon={mapcompleteLogo as StaticImport}
        title="MapComplete"
        minZoomLevel={props.minZoomLevel}
        position={props.position}
        className="mapcomplete-ctrl"
      />
    )
  );
};
