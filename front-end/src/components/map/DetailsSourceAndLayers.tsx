import { useLoadingSpinnerContext } from "@/src/context/LoadingSpinnerContext";
import { useSnackbarContext } from "@/src/context/SnackbarContext";
import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import { OwmfResponse } from "@/src/model/OwmfResponse";
import { MapService } from "@/src/services/MapService";
import type { BBox } from "geojson";
import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Source, useMap } from "react-map-gl/maplibre";
import { DetailsLayers, DetailsLayersProps } from "./DetailsLayers";

interface DetailsSourceAndLayersProps extends DetailsLayersProps {
  backEndService: MapService;
  backEndID: string;
}

export const DetailsSourceAndLayers: FC<DetailsSourceAndLayersProps> = (props) => {
  const [detailsData, setDetailsData] = useState<OwmfResponse | null>(null),
    { showSnackbar } = useSnackbarContext(),
    { showLoadingSpinner } = useLoadingSpinnerContext(),
    { lat, lon, zoom } = useUrlFragmentContext(),
    { current: map } = useMap(),
    { t, i18n } = useTranslation();

  useEffect(() => {
    if (props.minZoom && zoom < props.minZoom) return;

    const bounds = map?.getBounds().toArray(),
      bbox: BBox | null = bounds ? [...bounds[0], ...bounds[1]] : null;
    if (bbox && props.backEndService?.canHandleBackEnd(props.backEndID)) {
      console.debug(
        "DetailsSourceAndLayers fetching data", { bbox, backEnd: props.backEndID }
      );
      showLoadingSpinner(true);
      props.backEndService
        .fetchMapElements(props.backEndID, false, bbox, i18n.language)
        .then((data) => setDetailsData(data))
        .catch((e) => {
          console.error("Failed fetching map details", e);
          showSnackbar(t("snackbar.map_error"));
        })
        .finally(() => showLoadingSpinner(false));
    } else {
      console.debug("DetailsSourceAndLayers NOT fetching map details", { bbox, backEnd: props.backEndID });
      setDetailsData(null);
    }
  }, [i18n.language, map, props.backEndID, props.backEndService, props.minZoom, lat, lon, zoom, showLoadingSpinner, showSnackbar, t]);

  return (
    detailsData && (
      <Source id={props.sourceID} type="geojson" data={detailsData}>
        <DetailsLayers {...props} />
      </Source>
    )
  );
};
