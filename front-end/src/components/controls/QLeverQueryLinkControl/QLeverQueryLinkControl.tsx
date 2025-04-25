import { OsmInstance } from "@/src/model/LinkedEntity";
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
    return process.env.NEXT_PUBLIC_OWMF_qlever_enable === "true" && (<>
        <QueryLinkControl
            icon={qleverLogo}
            title={t("qlever_query", "Source SPARQL query on QLever UI for Wikidata")}
            sourceIDs={props.sourceIDs}
            mapEventField="qlever_wd_query"
            baseURL="https://qlever.cs.uni-freiburg.de/wikidata/?query="
            minZoomLevel={props.minZoomLevel}
            position={props.position}
        />
        <QueryLinkControl
            icon={qleverLogo}
            title={t("qlever_query", "Source SPARQL query on QLever UI for OSM Planet")}
            sourceIDs={props.sourceIDs}
            site={OsmInstance.OpenStreetMap}
            mapEventField="qlever_osm_query"
            baseURL="https://qlever.cs.uni-freiburg.de/osm-planet/?query="
            minZoomLevel={props.minZoomLevel}
            position={props.position}
        />
        <QueryLinkControl
            icon={qleverLogo}
            title={t("qlever_query", "Source SPARQL query on QLever UI for OHM Planet")}
            sourceIDs={props.sourceIDs}
            site={OsmInstance.OpenHistoricalMap}
            mapEventField="qlever_osm_query"
            baseURL="https://qlever.cs.uni-freiburg.de/ohm-planet/?query="
            minZoomLevel={props.minZoomLevel}
            position={props.position}
        />
    </>);
};