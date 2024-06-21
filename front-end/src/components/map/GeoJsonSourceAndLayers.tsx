import { DataDrivenPropertyValueSpecification } from "maplibre-gl";
import { MapGeoJSONFeature, Source } from "react-map-gl/maplibre";
import { DetailsLayers } from "./DetailsLayers";

interface GeoJsonSourceAndLayersProps {
    data: unknown;
    sourceID: string;

    /** The name of the field to be used as count */
    countFieldName?: string;

    /** The name of the field to be shown as count (the field value may be equal to the count or be a human-friendly version) */
    countShowFieldName?: string;

    /** GL-JS will automatically add the point_count and point_count_abbreviated properties to each cluster. Other properties can be added with this option. */
    clusterProperties?: object;

    /** Minimum zoom level to show the layers */
    minZoom: number;

    color: DataDrivenPropertyValueSpecification<string>;

    setOpenFeature: (feature?: MapGeoJSONFeature) => void;
}

export const GeoJsonSourceAndLayers: React.FC<GeoJsonSourceAndLayersProps> = (props) => {
    return (
        <Source id={props.sourceID}
            type="geojson"
            data={props.data} >
            <DetailsLayers minZoom={props.minZoom} sourceID={props.sourceID} color={props.color} setOpenFeature={props.setOpenFeature} />
        </Source>
    );
};
