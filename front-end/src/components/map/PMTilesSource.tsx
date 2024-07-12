import { PropsWithChildren } from "react";
import { Source } from "react-map-gl/maplibre";

const PMTILES_FILE_NAME = "etymology_map.pmtiles";

interface PMTilesSourceProps extends PropsWithChildren {
    id: string;
    keyID?: string;
}

/**
 * Source and layers from a remote PMTiles file
 * 
 * @see https://docs.protomaps.com/
 * @see https://docs.protomaps.com/pmtiles/maplibre
 */
export const PMTilesSource: React.FC<PMTilesSourceProps> = (props) => {
    if (!process.env.owmf_pmtiles_base_url) {
        console.warn("PMTilesSource: owmf_pmtiles_base_url is not defined");
        return null;
    }

    const fullPMTilesURL = `pmtiles://${process.env.owmf_pmtiles_base_url}${PMTILES_FILE_NAME}`;

    if (process.env.NODE_ENV === "development") console.log("PMTilesSource", { fullPMTilesURL, keyID: props.keyID });
    return <Source id={props.id} type="vector" url={fullPMTilesURL}>
        {props.children}
    </Source>;
}