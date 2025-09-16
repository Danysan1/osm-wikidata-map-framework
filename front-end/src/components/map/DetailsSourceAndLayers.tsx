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
}

export const DetailsSourceAndLayers: FC<DetailsSourceAndLayersProps> = (props) => {
  const [detailsData, setDetailsData] = useState<OwmfResponse>(),
    { showSnackbar } = useSnackbarContext(),
    { showLoadingSpinner } = useLoadingSpinnerContext(),
    { lat, lon, zoom, year, backEndID } = useUrlFragmentContext(),
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

    if (!props.backEndService?.canHandleBackEnd(backEndID)) {
      console.warn("Unsupported back-end ID, NOT fetching map clusters:", backEndID);
      return;
    }

    const bounds = map?.getBounds()?.toArray(),
      bbox: BBox | null = bounds ? [...bounds[0], ...bounds[1]] : null;
    if (!bbox) {
      console.warn("Missing bbox, NOT fetching map clusters");
      return;
    }

    const bboxArea = Math.abs((bbox[2] - bbox[0]) * (bbox[3] - bbox[1]));
    if (bboxArea < 0.0000001 || bboxArea > 1.6) {
      console.warn("BBox area too big, NOT fetching map details", {
        bbox,
        bboxArea,
        backEndID,
      });
      return;
    }

    console.debug("DetailsSourceAndLayers fetching data:", backEndID);
    showLoadingSpinner(true);
    props.backEndService
      .fetchMapElements(backEndID, false, bbox, i18n.language, year)
      .then(setDetailsData)
      .catch((e) => {
        console.error("Failed fetching map details", e);
        showSnackbar(t("snackbar.map_error"));
      })
      .finally(() => showLoadingSpinner(false));
  }, [
    backEndID,
    i18n.language,
    lat,
    lon,
    map,
    props.backEndService,
    props.minZoom,
    showLoadingSpinner,
    showSnackbar,
    t,
    year,
    zoom,
  ]);

  if (!detailsData) {
    console.debug("detailsData is still loading");
    return null;
  } else if (detailsData.backEndID !== backEndID) {
    console.warn("Outdated detailsData backEndID, hiding details source");
    setDetailsData(undefined);
    return null;
  }

  return (
    <Source id={props.sourceID} type="geojson" data={detailsData}>
      <DetailsLayers {...props} />
    </Source>
  );
};
