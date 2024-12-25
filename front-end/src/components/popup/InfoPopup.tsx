import Script from "next/script";
import { FC, useEffect, useState } from "react";
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
    [customIntroJS, setCustomIntroJS] = useState<string>();

  useEffect(() => {
    console.debug(
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
      anchor="bottom-left"
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
