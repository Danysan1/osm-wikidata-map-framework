import { DataDrivenPropertyValueSpecification } from "maplibre-gl";
import { useMemo } from "react";
import { MapGeoJSONFeature, Source } from "react-map-gl/maplibre";
import { DetailsLayers } from "./DetailsLayers";

interface PMTilesSourceAndLayersProps {
    sourceID: string;
    pmtilesBaseURL: string;
    pmtilesFileName: string;
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
    const fullPMTilesURL = useMemo(() => `pmtiles://${props.pmtilesBaseURL}${props.pmtilesFileName}`, [props.pmtilesBaseURL, props.pmtilesFileName]);

    if (process.env.NODE_ENV === "development") console.log("PMTilesSourceAndLayers", { fullPMTilesURL, keyID: props.keyID });
    return <Source id={props.sourceID} type="vector" url={fullPMTilesURL}>
        <DetailsLayers minZoom={0} sourceID="pmtiles" source_layer="etymology_map" keyID={props.keyID} color={props.color} setOpenFeature={props.setOpenFeature} />
    </Source>;
}