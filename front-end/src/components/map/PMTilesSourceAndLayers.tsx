import { useMemo } from "react";
import { MapGeoJSONFeature, Source } from "react-map-gl/maplibre";
import { DetailsLayers } from "./DetailsLayers";

interface PMTilesSourceAndLayersProps {
    sourceID: string;
    pmtilesBaseURL: string;
    pmtilesFileName: string;
    keyID?: string;
    maxBoundaryZoom?: number;

    setOpenFeature: (feature?: MapGeoJSONFeature) => void;
}

/**
 * Source and layers from a remote PMTiles file
 * 
 * @see https://docs.protomaps.com/
 * @see https://docs.protomaps.com/pmtiles/maplibre
 */
export const PMTilesSourceAndLayers: React.FC<PMTilesSourceAndLayersProps> = (props) => {
    const fullPMTilesURL = useMemo(() => `pmtiles://${props.pmtilesBaseURL}${props.pmtilesFileName}`, [props.pmtilesBaseURL, props.pmtilesFileName]);

    return <Source id={props.sourceID} type="vector" url={fullPMTilesURL}>
        <DetailsLayers minZoom={0} sourceID="pmtiles" source_layer="etymology_map" keyID={props.keyID} color="#ff0000" setOpenFeature={props.setOpenFeature} />
    </Source>;
}