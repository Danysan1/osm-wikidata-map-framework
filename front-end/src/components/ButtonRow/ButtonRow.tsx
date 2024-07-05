import { StaticImport } from "next/dist/shared/lib/get-img-props";
import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";
import styles from "./ButtonRow.module.css";
import commonsLogo from "./img/Commons-logo.svg";
import openStreetMapLogo from "./img/OpenStreetMap_logo.svg";
import wikidataLogo from "./img/Wikidata.svg";
import wikipediaLogo from "./img/Wikipedia-logo-v2.svg";
import wikisporeLogo from "./img/Wikispore_logo_without_text.svg";
import entitreeLogo from "./img/entitree.png";

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
  const { t } = useTranslation();

  return (
    <div className={`${styles.button_row} ${props.className}`}>
      {props.wikipedia && (
        <Button
          href={props.wikipedia}
          title="Wikipedia"
          className="element_wikipedia_button"
          icon={wikipediaLogo as StaticImport}
          iconAlt="Wikipedia logo"
          text="Wikipedia"
        />
      )}
      {props.wikispore && (
        <Button
          href={props.wikispore}
          title="Wikispore"
          className="element_wikispore_button"
          icon={wikisporeLogo as StaticImport}
          iconAlt="Wikispore logo"
          text="Wikispore"
        />
      )}
      {props.commons && (
        <Button
          href={props.commons}
          title="Wikimedia Commons"
          className="element_commons_button"
          icon={commonsLogo as StaticImport}
          iconAlt="Wikimedia Commons logo"
          text="Commons"
        />
      )}
      {props.wikidata && (
        <Button
          href={props.wikidata}
          title="Wikidata"
          className="element_wikidata_button"
          icon={wikidataLogo as StaticImport}
          iconAlt="Wikidata logo"
          text="Wikidata"
        />
      )}
      {props.openstreetmap && (
        <Button
          href={props.openstreetmap}
          title="OpenStreetMap"
          className="element_osm_button"
          icon={openStreetMapLogo as StaticImport}
          iconAlt="OpenStreetMap logo"
          text="OpenStreetMap"
        />
      )}
      {props.website && (
        <Button
          href={props.website}
          title="Official website"
          className="element_website_button"
          iconText="🌐"
          iconAlt="Official website symbol"
          text="Website"
        />
      )}
      {props.osmWikidataMatcher && (
        <Button
          href={props.osmWikidataMatcher}
          title="OSM ↔ Wikidata matcher"
          className="element_matcher_button"
          icon="/img/osm-wd-matcher.png"
          iconAlt="OSM ↔ Wikidata matcher logo"
          text="OSM ↔ Wikidata matcher"
        />
      )}
      {props.mapcomplete && (
        <Button
          href={props.mapcomplete}
          title="MapComplete"
          className="element_mapcomplete_button"
          icon="/img/mapcomplete.svg"
          iconAlt="MapComplete logo"
          text="Mapcomplete"
        />
      )}
      {props.iD && (
        <Button
          href={props.iD}
          title="iD editor"
          className="element_id_button"
          icon="/img/OpenStreetMap-Editor_iD_Logo.svg"
          iconAlt="iD editor logo"
          text="iD editor"
        />
      )}
      {props.entitree && (
        <Button
          href={props.entitree}
          title="EntiTree"
          className="entitree_button"
          icon={entitreeLogo}
          iconAlt="EntiTree logo"
          text="EntiTree"
        />
      )}
      {props.location && (
        <Button
          onClick={typeof props.location === "function" ? props.location : undefined}
          href={typeof props.location === "string" ? props.location : undefined}
          title={t("feature_details.location", "Location")}
          className="element_location_button"
          iconText="🎯"
          iconAlt="Location symbol"
          text={t("feature_details.location", "Location")}
        />
      )}
    </div>
  );
};
