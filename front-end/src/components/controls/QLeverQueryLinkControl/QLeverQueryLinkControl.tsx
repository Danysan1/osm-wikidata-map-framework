import { useTranslation } from "react-i18next";
import { ControlPosition } from "react-map-gl/maplibre";
import { QueryLinkControl } from "../QueryLinkControl";
import qleverLogo from "./qlever.ico";

interface QLeverQueryLinkControlProps {
  sourceIDs: string[];
  minZoomLevel?: number;
  position: ControlPosition;
}

export const QLeverQueryLinkControls: React.FC<QLeverQueryLinkControlProps> = (props) => {
  const { t } = useTranslation();

  if (!process.env.NEXT_PUBLIC_OWMF_qlever_instance_url) return null;

  return (
    <>
      {!!process.env.NEXT_PUBLIC_OWMF_qlever_wikibase_source && (
        <QueryLinkControl
          icon={qleverLogo}
          title={t("qlever_query", "Source SPARQL query on QLever UI for Wikidata")}
          sourceIDs={props.sourceIDs}
          mapEventField="qlever_wd_query"
          baseURL={`${process.env.NEXT_PUBLIC_OWMF_qlever_instance_url}/${process.env.NEXT_PUBLIC_OWMF_qlever_wikibase_source}?query=`}
          minZoomLevel={props.minZoomLevel}
          position={props.position}
        />
      )}
      {!!process.env.NEXT_PUBLIC_OWMF_qlever_osm_source && (
        <QueryLinkControl
          icon={qleverLogo}
          title={t("qlever_query", "Source SPARQL query on QLever UI for OSM Planet")}
          sourceIDs={props.sourceIDs}
          mapEventField="qlever_osm_query"
          baseURL={`${process.env.NEXT_PUBLIC_OWMF_qlever_instance_url}/${process.env.NEXT_PUBLIC_OWMF_qlever_osm_source}?query=`}
          minZoomLevel={props.minZoomLevel}
          position={props.position}
        />
      )}
    </>
  );
};
