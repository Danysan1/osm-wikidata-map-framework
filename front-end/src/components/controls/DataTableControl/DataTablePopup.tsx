import { EtymologyFeature } from "@/src/model/EtymologyResponse";
import { FC } from "react";
import { LngLat, Popup } from "react-map-gl/maplibre";
import { DataTablePanel } from "./DataTablePanel";

interface DataTablePopupProps {
    features: EtymologyFeature[];
    className?: string;
    position: LngLat;
    onClose: () => void;
}

export const DataTablePopup: FC<DataTablePopupProps> = (props) => {
    return <Popup longitude={props.position.lng}
        latitude={props.position.lat}
        className={props.className}
        maxWidth="none"
        closeButton
        closeOnClick
        closeOnMove
        onClose={props.onClose}>
        <DataTablePanel features={props.features} />
    </Popup>
}