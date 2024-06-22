import { DataDrivenPropertyValueSpecification } from "maplibre-gl";
import { MapGeoJSONFeature, Source } from "react-map-gl/maplibre";
import { DetailsLayers } from "./DetailsLayers";

const PMTILES_FILE_NAME = "etymology_map.pmtiles";

interface PMTilesSourceAndLayersProps {
    sourceID: string;
    keyID?: string;

    color: DataDrivenPropertyValueSpecification<string>;

    setOpenFeature: (feature?: MapGeoJSONFeature) => void;
}

/**
 * Source and layers from a remote PMTiles file
 * 
 * @see https://docs.protomaps.com/
 * @see https://docs.protomaps.com/pmtiles/maplibre
 */
export const PMTilesSourceAndLayers: React.FC<PMTilesSourceAndLayersProps> = (props) => {
    if (!process.env.owmf_pmtiles_base_url) {
        console.warn("PMTilesSourceAndLayers: owmf_pmtiles_base_url is not defined");
        return null;
    }

    const fullPMTilesURL = `pmtiles://${process.env.owmf_pmtiles_base_url}${PMTILES_FILE_NAME}`;

    if (process.env.NODE_ENV === "development") console.log("PMTilesSourceAndLayers", { fullPMTilesURL, keyID: props.keyID });
    return <Source id={props.sourceID} type="vector" url={fullPMTilesURL}>
        <DetailsLayers minZoom={0} sourceID="pmtiles" source_layer="etymology_map" keyID={props.keyID} color={props.color} setOpenFeature={props.setOpenFeature} />
    </Source>;
}