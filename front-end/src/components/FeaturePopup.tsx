import { useTranslation } from "next-i18next";
import { FC } from "react";
import { Popup, useMap } from "react-map-gl/maplibre";
import { EtymologyFeature } from "../model/EtymologyResponse";

interface FeaturePopupProps {
    feature: EtymologyFeature;
    className?: string;
    onClose: () => void;
}

export const FeaturePopup: FC<FeaturePopupProps> = (props) => {
    const { t } = useTranslation();
    const { map } = useMap();
    const position = map?.getBounds()?.getSouthWest(); // No useMemo is correct, the coordinates change over time
    return position && <Popup longitude={position.lng} latitude={position.lat} className={props.className} maxWidth="none" closeButton closeOnClick closeOnMove onClose={props.onClose}>
        {JSON.stringify(props.feature.properties)}
    </Popup>
}