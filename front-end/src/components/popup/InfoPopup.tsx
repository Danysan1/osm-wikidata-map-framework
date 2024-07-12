import { Popup as PopupRef } from "maplibre-gl";
import Script from "next/script";
import { FC, useEffect, useRef, useState } from "react";
import { LngLat, Popup } from "react-map-gl/maplibre";
import { InfoPanel } from "../InfoPanel/InfoPanel";
import styles from "./popup.module.css";

interface InfoPopupProps {
  showInstructions?: boolean;
  position: LngLat;
  onClose: () => void;
}

export const InfoPopup: FC<InfoPopupProps> = (props) => {
  const [customIntroHTML, setCustomIntroHTML] = useState<string>(),
    popupRef = useRef<PopupRef>(null),
    [customIntroJS, setCustomIntroJS] = useState<string>();

  useEffect(() => {
    if (process.env.NODE_ENV === "development") console.debug(
      "InfoPopup fetching custom intro",
      process.env.owmf_custom_intro_html
    );
    if (process.env.owmf_custom_intro_html) {
      fetch(process.env.owmf_custom_intro_html)
        .then((response) => response.text())
        .then((text) => {
          setCustomIntroHTML(text);
          setCustomIntroJS(process.env.owmf_custom_intro_js);
        })
        .catch((error) => console.error("Failed to load custom intro HTML", error));
    }
  }, []);

  useEffect(
    () => popupRef.current?.getElement()?.querySelector(".maplibregl-popup-close-button")?.scrollIntoView(true),
    [popupRef, props.showInstructions]
  );

  return (
    <Popup
      longitude={props.position.lng}
      latitude={props.position.lat}
      className={styles.custom_popup}
      maxWidth="none"
      closeButton
      closeOnClick
      closeOnMove
      onClose={props.onClose}
      ref={popupRef}
    >
      {customIntroHTML ? (
        <div id="custom_intro" dangerouslySetInnerHTML={{ __html: customIntroHTML }} />
      ) : (
        <InfoPanel showInstructions={props.showInstructions} />
      )}
      {customIntroJS && <Script src={customIntroJS} strategy="afterInteractive" />}
    </Popup>
  );
};
