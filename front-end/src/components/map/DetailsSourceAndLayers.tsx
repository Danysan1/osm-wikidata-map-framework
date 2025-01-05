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
    { lat, lon, zoom, year } = useUrlFragmentContext(),
    { current: map } = useMap(),
    { t, i18n } = useTranslation();

  useEffect(() => {
    if (props.minZoom && zoom < props.minZoom) {
      console.debug("Zoom level too low, NOT fetching map details", {
        zoom,
        minZoom: props.minZoom,
      });
      return;
    }

    const bounds = map?.getBounds().toArray(),
      bbox: BBox | null = bounds ? [...bounds[0], ...bounds[1]] : null;
    if (!bbox || !props.backEndService?.canHandleBackEnd(props.backEndID)) {
      console.warn("Unsupported back-end ID or missing bbox, NOT fetching map details", {
        bbox,
        backEndID: props.backEndID,
      });
      return;
    }

    const bboxArea = Math.abs((bbox[2] - bbox[0]) * (bbox[3] - bbox[1]));
    if (bboxArea < 0.0000001 || bboxArea > 1.5) {
      console.debug("BBox area too big, NOT fetching map details", {
        bbox,
        backEndID: props.backEndID,
      });
      return;
    }

    console.debug("DetailsSourceAndLayers fetching data", {
      bbox,
      backEndID: props.backEndID,
    });
    showLoadingSpinner(true);
    props.backEndService
      .fetchMapElements(props.backEndID, false, bbox, i18n.language, year)
      .then((data) => setDetailsData(data))
      .catch((e) => {
        console.error("Failed fetching map details", e);
        showSnackbar(t("snackbar.map_error"));
      })
      .finally(() => showLoadingSpinner(false));
  }, [
    i18n.language,
    lat,
    lon,
    map,
    props.backEndID,
    props.backEndService,
    props.minZoom,
    showLoadingSpinner,
    showSnackbar,
    t,
    year,
    zoom
  ]);

  return (
    detailsData && (
      <Source id={props.sourceID} type="geojson" data={detailsData}>
        <DetailsLayers {...props} />
      </Source>
    )
  );
};
