import { useTranslation } from "next-i18next";
import Image from "next/image";
import styles from "./ButtonRow.module.css";

interface ButtonRowProps {
    commons?: string;
    entitree?: string;
    iD?: string;
    location?: string | (() => void);
    mapcomplete?: string;
    openstreetmap?: string;
    osmWikidataMatcher?: string;
    website?: string;
    wikidata?: string;
    wikipedia?: string;
    wikispore?: string;
    className?: string;
}

export const ButtonRow: React.FC<ButtonRowProps> = (props) => {
    const { t } = useTranslation('common');

    return <div className={`${styles["button-row"]} ${props.className}`}>
        {props.wikipedia && <a href={props.wikipedia} title="Wikipedia" role="button" className="k-button w3-button w3-white w3-border w3-round-large button-6 element_wikipedia_button">
            <Image className="button_img" src="img/Wikipedia-logo-v2.svg" alt="Wikipedia logo" />
            <span className="button_text"> Wikipedia</span>
        </a>}
        {props.wikispore && <a href={props.wikispore} title="Wikispore" role="button" className="k-button w3-button w3-white w3-border w3-round-large button-6 element_wikispore_button">
            <Image className="button_img" src="img/Wikispore_logo_without_text.svg" alt="Wikispore logo" />
            <span className="button_text"> Wikispore</span>
        </a>}
        {props.commons && <a href={props.commons} title="Wikimedia Commons" role="button" className="k-button w3-button w3-white w3-border w3-round-large button-6 element_commons_button">
            <Image className="button_img" src="img/Commons-logo.svg" alt="Wikimedia Commons logo" />
            <span className="button_text"> Commons</span>
        </a>}
        {props.wikidata && <a href={props.wikidata} title="Wikidata" role="button" className="k-button w3-button w3-white w3-border w3-round-large button-6 element_wikidata_button">
            <Image className="button_img" src="img/Wikidata.svg" alt="Wikidata logo" />
            <span className="button_text"> Wikidata</span>
        </a>}
        {props.openstreetmap && <a href={props.openstreetmap} title="OpenStreetMap" role="button" className="k-button w3-button w3-white w3-border w3-round-large button-6 element_osm_button">
            <Image className="button_img" src="img/Openstreetmap_logo.svg" alt="OpenStreetMap logo" />
            <span className="button_text"> OpenStreetMap</span>
        </a>}
        {props.website && <a href={props.website} title="Official website" role="button" className="k-button w3-button w3-white w3-border w3-round-large button-6 element_website_button">
            <span className="button_img">🌐</span>
            <span className="button_text"> Website</span>
        </a>}
        {props.osmWikidataMatcher && <a href={props.osmWikidataMatcher} title="OSM ↔ Wikidata matcher" role="button" className="k-button w3-button w3-white w3-border w3-round-large button-6 element_matcher_button">
            <Image className="button_img" src="img/osm-wd-matcher.png" alt="OSM ↔ Wikidata matcher logo" />
            <span className="button_text"> OSM ↔ Wikidata matcher</span>
        </a>}
        {props.mapcomplete && <a href={props.mapcomplete} title="MapComplete" role="button" className="k-button w3-button w3-white w3-border w3-round-large button-6 element_mapcomplete_button">
            <Image className="button_img" src="img/mapcomplete.svg" alt="MapComplete logo" />
            <span className="button_text"> Mapcomplete</span>
        </a>}
        {props.iD && <a href={props.iD} title="iD editor" role="button" className="k-button w3-button w3-white w3-border w3-round-large button-6 element_id_button">
            <Image className="button_img" src="img/OpenStreetMap-Editor_iD_Logo.svg" alt="iD editor logo" />
            <span className="button_text"> iD editor</span>
        </a>}
        {props.entitree && <a href={props.entitree} title="EntiTree" role="button" className="k-button w3-button w3-white w3-border w3-round-large button-6 entitree_button">
            <Image className="button_img" src="img/entitree.png" alt="EntiTree logo" />
            <span className="button_text"> EntiTree</span>
        </a>}
        {props.location && <a onClick={typeof props.location === 'function' ? props.location : undefined} href={typeof props.location === 'string' ? props.location : undefined} title={t("feature_details.location", "Location")} role="button" className="k-button w3-button w3-white w3-border w3-round-large button-6 element_location_button" target="_self">
            <span className="button_img">🎯</span>
            <span className="button_text" aria-label={t("feature_details.location", "Location")}>{t("feature_details.location", "Location")}</span>
        </a>}
    </div>;
};