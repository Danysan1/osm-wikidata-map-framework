import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import { EtymologyResponse } from "@/src/model/EtymologyResponse";
import { MapService } from "@/src/services/MapService";
import { showLoadingSpinner, showSnackbar } from "@/src/snackbar";
import type { BBox } from "geojson";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Source, useMap } from "react-map-gl/maplibre";
import { DetailsLayers, DetailsLayersProps } from "./DetailsLayers";

interface DetailsSourceAndLayersProps extends DetailsLayersProps {
  backEndService: MapService;
  backEndID: string;
}

export const DetailsSourceAndLayers: React.FC<DetailsSourceAndLayersProps> = (props) => {
  const [detailsData, setDetailsData] = useState<EtymologyResponse | null>(null),
    { lat, lon, zoom } = useUrlFragmentContext(),
    { current: map } = useMap(),
    { i18n } = useTranslation();

  useEffect(() => {
    if (props.minZoom && zoom < props.minZoom) return;

    const bounds = map?.getBounds().toArray(),
      bbox: BBox | null = bounds ? [...bounds[0], ...bounds[1]] : null;
    if (process.env.NODE_ENV === "development") console.debug(
      "DetailsSourceAndLayers useEffect", { bbox }
    );
    if (bbox && props.backEndService?.canHandleBackEnd(props.backEndID)) {
      showLoadingSpinner(true);
      props.backEndService
        .fetchMapElements(props.backEndID, false, bbox, i18n.language)
        .then((data) => setDetailsData(data))
        .catch((e) => {
          console.error("Failed fetching map elements", e);
          showSnackbar("snackbar.map_error");
        })
        .finally(() => showLoadingSpinner(false));
    } else {
      setDetailsData(null);
    }
  }, [i18n.language, map, props.backEndID, props.backEndService, props.minZoom, lat, lon, zoom]);

  return (
    detailsData && (
      <Source id={props.sourceID} type="geojson" data={detailsData}>
        <DetailsLayers {...props} />
      </Source>
    )
  );
};
