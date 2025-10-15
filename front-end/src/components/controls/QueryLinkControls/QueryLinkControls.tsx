import { useTranslation } from "react-i18next";
import { ControlPosition } from "react-map-gl/maplibre";
import { QueryLinkControl } from "./QueryLinkControl";
import qleverLogo from "./qlever.ico";
import overpassLogo from "@/src/img/Overpass-turbo.svg";
import wikidataLogo from "@/src/img/Wikidata_Query_Service_Favicon.svg";
import { StaticImport } from "next/dist/shared/lib/get-img-props";

interface QueryLinkControlsProps {
  sourceIDs: string[];
  minZoomLevel?: number;
  position: ControlPosition;
}

export const QueryLinkControls: React.FC<QueryLinkControlsProps> = ({ sourceIDs, minZoomLevel, position }) => {
  const { t } = useTranslation();

  return (
    <>
      {!!process.env.NEXT_PUBLIC_OWMF_overpass_api_url && <QueryLinkControl
        icon={overpassLogo as StaticImport}
        title={t("overpass_turbo_query", "Source OverpassQL query on Overpass Turbo")}
        sourceIDs={sourceIDs}
        mapEventField="overpass_query"
        baseURL={`${process.env.NEXT_PUBLIC_OWMF_overpass_turbo_url}?Q=`}
        minZoomLevel={minZoomLevel}
        position="top-right"
      />}
      {!!process.env.NEXT_PUBLIC_OWMF_postpass_api_url && <QueryLinkControl
        icon={overpassLogo as StaticImport}
        title={t("overpass_turbo_query", "Source OverpassQL query on Overpass Turbo")}
        sourceIDs={sourceIDs}
        mapEventField="postpass_query"
        baseURL={`${process.env.NEXT_PUBLIC_OWMF_overpass_turbo_url}?Q={{data%3Asql%2Cserver%3D${encodeURIComponent(process.env.NEXT_PUBLIC_OWMF_postpass_api_url?.replace("interpreter",""))}}}`}
        minZoomLevel={minZoomLevel}
        position="top-right"
      />}
      {!!process.env.NEXT_PUBLIC_OWMF_wikibase_sparql_endpoint_url && <QueryLinkControl
        icon={wikidataLogo as StaticImport}
        title={t("wdqs_query", "Source SPARQL query on Wikidata Query Service")}
        sourceIDs={sourceIDs}
        mapEventField="wdqs_query"
        baseURL={`${process.env.NEXT_PUBLIC_OWMF_wikibase_sparql_endpoint_url}/#`}
        minZoomLevel={minZoomLevel}
        position="top-right"
      />}
      {!!process.env.NEXT_PUBLIC_OWMF_qlever_instance_url && !!process.env.NEXT_PUBLIC_OWMF_qlever_wikibase_source && (
        <QueryLinkControl
          icon={qleverLogo}
          title={t("qlever_query", "Source SPARQL query on QLever UI for Wikidata")}
          sourceIDs={sourceIDs}
          mapEventField="qlever_wd_query"
          baseURL={`${process.env.NEXT_PUBLIC_OWMF_qlever_instance_url}/${process.env.NEXT_PUBLIC_OWMF_qlever_wikibase_source}?query=`}
          minZoomLevel={minZoomLevel}
          position={position}
        />
      )}
      {!!process.env.NEXT_PUBLIC_OWMF_qlever_instance_url && !!process.env.NEXT_PUBLIC_OWMF_qlever_osm_source && (
        <QueryLinkControl
          icon={qleverLogo}
          title={t("qlever_query", "Source SPARQL query on QLever UI for OSM Planet")}
          sourceIDs={sourceIDs}
          mapEventField="qlever_osm_query"
          baseURL={`${process.env.NEXT_PUBLIC_OWMF_qlever_instance_url}/${process.env.NEXT_PUBLIC_OWMF_qlever_osm_source}?query=`}
          minZoomLevel={minZoomLevel}
          position={position}
        />
      )}
    </>
  );
};
