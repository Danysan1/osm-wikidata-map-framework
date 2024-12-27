import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import mapcompleteLogo from "@/src/img/mapcomplete.svg";
import iDEditorLogo from "@/src/img/OpenStreetMap-Editor_iD_Logo.svg";
import osmWdMatcherLogo from "@/src/img/osm-wd-matcher.png";
import { getFeatureTags, type OwmfFeature } from "@/src/model/OwmfResponse";
import type { Position } from "geojson";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";
import { ButtonRow } from "./ButtonRow";
import openHistoricalMapLogo from "./img/OpenHistoricalMap_logo.svg";
import openStreetMapLogo from "./img/Openstreetmap_logo.svg";

interface FeatureButtonRowProps {
  feature: OwmfFeature;
  className?: string;
  openFeatureDetails?: () => void;
}

export const FeatureButtonRow: React.FC<FeatureButtonRowProps> = ({
  feature,
  className,
  openFeatureDetails,
}) => {
  const osm_full_id =
      feature.properties?.osm_type && feature.properties?.osm_id
        ? feature.properties.osm_type + "/" + feature.properties?.osm_id
        : null,
    { t } = useTranslation(),
    { backEndID } = useUrlFragmentContext(),
    openHistoricalMapURL =
      osm_full_id && backEndID.includes("ohm")
        ? `https://www.openhistoricalmap.org/${osm_full_id}`
        : undefined,
    openStreetMapURL =
      osm_full_id && !backEndID.includes("ohm")
        ? `https://www.openstreetmap.org/${osm_full_id}`
        : undefined,
    { setLat, setLon, setZoom } = useUrlFragmentContext();

  let pos: Position | undefined;
  if (feature.geometry.type === "Point") {
    pos = feature.geometry.coordinates;
  } else if (feature.geometry.type === "LineString") {
    pos = feature.geometry.coordinates[0];
  } else if (feature.geometry.type === "Polygon") {
    pos = feature.geometry.coordinates[0][0];
  } else if (feature.geometry.type === "MultiPolygon") {
    pos = feature.geometry.coordinates[0][0][0];
  }
  const lon = pos?.at(0),
    lat = pos?.at(1),
    zoomOnLocation =
      lon !== undefined && lat !== undefined
        ? () => {
            setLon(lon);
            setLat(lat);
            setZoom((oldZoom) => oldZoom + 2);
          }
        : undefined;

  let osmWikidataMatcherURL;
  if (
    osm_full_id &&
    !feature.properties?.wikidata &&
    lat !== undefined &&
    lon !== undefined
  )
    osmWikidataMatcherURL = `https://map.osm.wikidata.link/map/18/${lat}/${lon}`;
  if (feature.properties?.wikidata && !osm_full_id)
    osmWikidataMatcherURL = `https://map.osm.wikidata.link/item/${feature.properties.wikidata}`;

  const mapcomplete_theme = process.env.owmf_mapcomplete_theme,
    mapcompleteURL =
      osm_full_id &&
      mapcomplete_theme &&
      lat !== undefined &&
      lon !== undefined &&
      !feature.properties?.boundary
        ? `https://mapcomplete.org/${mapcomplete_theme}?z=18&lat=${lat}&lon=${lon}#${osm_full_id}`
        : undefined,
    iDEditorURL =
      feature.properties?.osm_type &&
      feature.properties?.osm_id &&
      !feature.properties?.boundary
        ? `https://www.openstreetmap.org/edit?editor=id&${feature.properties.osm_type}=${feature.properties.osm_id}`
        : undefined;

  return (
    <ButtonRow
      commons={feature.properties?.commons}
      websiteURL={getFeatureTags(feature)?.website}
      wikidata={feature.properties?.wikidata}
      wikipedia={feature.properties?.wikipedia}
      wikispore={feature.properties?.wikispore}
      className={className}
      onOpenInfo={openFeatureDetails}
    >
      {openStreetMapURL && (
        <Button
          href={openStreetMapURL}
          title="OpenStreetMap"
          className="osm_button"
          icon={openStreetMapLogo as StaticImport}
          iconAlt="OpenStreetMap logo"
          text="OpenStreetMap"
        />
      )}
      {openHistoricalMapURL && (
        <Button
          href={openHistoricalMapURL}
          title="OpenHistoricalMap"
          className="osm_button"
          icon={openHistoricalMapLogo as StaticImport}
          iconAlt="OpenHistoricalMap logo"
          text="OpenHistoricalMap"
        />
      )}
      {iDEditorURL && (
        <Button
          href={iDEditorURL}
          title="iD editor"
          className="id_button"
          icon={iDEditorLogo as StaticImport}
          iconAlt="iD editor logo"
          text="iD editor"
        />
      )}
      {zoomOnLocation && (
        <Button
          onClick={zoomOnLocation}
          title={t("feature_details.location", "Location")}
          className="location_button"
          iconText="🎯"
          iconAlt="Location symbol"
          text={t("feature_details.location", "Location")}
        />
      )}
      {mapcompleteURL && (
        <Button
          href={mapcompleteURL}
          title="MapComplete"
          className="mapcomplete_button"
          icon={mapcompleteLogo as StaticImport}
          iconAlt="MapComplete logo"
          text="Mapcomplete"
        />
      )}
      {osmWikidataMatcherURL && (
        <Button
          href={osmWikidataMatcherURL}
          title="OSM ↔ Wikidata matcher"
          className="matcher_button"
          icon={osmWdMatcherLogo as StaticImport}
          iconAlt="OSM ↔ Wikidata matcher logo"
          text="OSM ↔ Wikidata matcher"
        />
      )}
    </ButtonRow>
  );
};
