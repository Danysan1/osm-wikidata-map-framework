import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import { EtymologyFeature } from "@/src/model/EtymologyResponse";
import { Position } from "geojson";
import { ButtonRow } from "./ButtonRow";

interface FeatureButtonRowProps {
  feature: EtymologyFeature;
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
    openstreetmap = osm_full_id
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

  let osmWikidataMatcher;
  if (
    osm_full_id &&
    !feature.properties?.wikidata &&
    lat !== undefined &&
    lon !== undefined
  )
    osmWikidataMatcher = `https://map.osm.wikidata.link/map/18/${lat}/${lon}`;
  if (feature.properties?.wikidata && !osm_full_id)
    osmWikidataMatcher = `https://map.osm.wikidata.link/item/${feature.properties.wikidata}`;

  const mapcomplete_theme = process.env.owmf_mapcomplete_theme,
    mapcomplete =
      osm_full_id &&
        mapcomplete_theme &&
        lat !== undefined &&
        lon !== undefined &&
        !feature.properties?.boundary
        ? `https://mapcomplete.org/${mapcomplete_theme}?z=18&lat=${lat}&lon=${lon}#${osm_full_id}`
        : undefined,
    iD =
      feature.properties?.osm_type &&
        feature.properties?.osm_id &&
        !feature.properties?.boundary
        ? `https://www.openstreetmap.org/edit?editor=id&${feature.properties.osm_type}=${feature.properties.osm_id}`
        : undefined;

  return (
    <ButtonRow
      commons={feature.properties?.commons}
      iDEditorURL={iD}
      location={zoomOnLocation}
      mapcompleteURL={mapcomplete}
      openstreetmapURL={openstreetmap}
      osmWikidataMatcherURL={osmWikidataMatcher}
      websiteURL={feature.properties?.website_url}
      wikidata={feature.properties?.wikidata}
      wikipedia={feature.properties?.wikipedia}
      wikispore={feature.properties?.wikispore}
      className={className}
      onOpenInfo={openFeatureDetails}
    />
  );
};
