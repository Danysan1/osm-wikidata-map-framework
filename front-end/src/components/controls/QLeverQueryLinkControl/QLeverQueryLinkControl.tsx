import { parseBoolConfig } from "@/src/config";
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
    return parseBoolConfig(process.env.owmf_qlever_enable) && (<>
        <QueryLinkControl
            icon={qleverLogo}
            title={t("qlever_query", "Source SPARQL query on QLever UI")}
            sourceIDs={props.sourceIDs}
            mapEventField="qlever_wd_query"
            baseURL="https://qlever.cs.uni-freiburg.de/wikidata/?query="
            minZoomLevel={props.minZoomLevel}
            position={props.position}
        />
        <QueryLinkControl
            icon={qleverLogo}
            title={t("qlever_query", "Source SPARQL query on QLever UI")}
            sourceIDs={props.sourceIDs}
            mapEventField="qlever_osm_query"
            baseURL="https://qlever.cs.uni-freiburg.de/osm-planet/?query="
            minZoomLevel={props.minZoomLevel}
            position={props.position}
        />
    </>);
};