import { StaticImport } from "next/dist/shared/lib/get-img-props";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";
import styles from "./ButtonRow.module.css";
import commonsLogo from "./img/Commons-logo.svg";
import openStreetMapLogo from "./img/Openstreetmap_logo.svg";
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
  openInfo?: () => void;
}

export const ButtonRow: React.FC<ButtonRowProps> = (props) => {
  const { t } = useTranslation(),
    commonsURL = useMemo(() => {
      if (!props.commons || props.commons === "null")
        return undefined;

      if (props.commons.startsWith("Category:"))
        return `https://commons.wikimedia.org/wiki/${props.commons}`;

      if (
        !props.commons.startsWith("http") &&
        !props.commons.includes("File:")
      )
        return `https://commons.wikimedia.org/wiki/Category:${props.commons}`;

      return props.commons;
    }, [props.commons]);

  return (
    <div className={`${styles.button_row} ${props.className}`}>
      {props.openInfo && (
        <Button
          onClick={props.openInfo}
          title="More info"
          className="info_button"
          iconText="ℹ️"
          iconAlt="Information symbol"
          text="More info"
        />
      )}
      {props.wikipedia && (
        <Button
          href={props.wikipedia}
          title="Wikipedia"
          className="wikipedia_button"
          icon={wikipediaLogo as StaticImport}
          iconAlt="Wikipedia logo"
          text="Wikipedia"
        />
      )}
      {props.wikispore && (
        <Button
          href={props.wikispore}
          title="Wikispore"
          className="wikispore_button"
          icon={wikisporeLogo as StaticImport}
          iconAlt="Wikispore logo"
          text="Wikispore"
        />
      )}
      {props.commons && (
        <Button
          href={commonsURL}
          title="Wikimedia Commons"
          className="commons_button"
          icon={commonsLogo as StaticImport}
          iconAlt="Wikimedia Commons logo"
          text="Commons"
        />
      )}
      {props.wikidata && (
        <Button
          href={props.wikidata}
          title="Wikidata"
          className="wikidata_button"
          icon={wikidataLogo as StaticImport}
          iconAlt="Wikidata logo"
          text="Wikidata"
        />
      )}
      {props.openstreetmap && (
        <Button
          href={props.openstreetmap}
          title="OpenStreetMap"
          className="osm_button"
          icon={openStreetMapLogo as StaticImport}
          iconAlt="OpenStreetMap logo"
          text="OpenStreetMap"
        />
      )}
      {props.website && (
        <Button
          href={props.website}
          title="Official website"
          className="website_button"
          iconText="🌐"
          iconAlt="Official website symbol"
          text="Website"
        />
      )}
      {props.osmWikidataMatcher && (
        <Button
          href={props.osmWikidataMatcher}
          title="OSM ↔ Wikidata matcher"
          className="matcher_button"
          icon="/img/osm-wd-matcher.png"
          iconAlt="OSM ↔ Wikidata matcher logo"
          text="OSM ↔ Wikidata matcher"
        />
      )}
      {props.mapcomplete && (
        <Button
          href={props.mapcomplete}
          title="MapComplete"
          className="mapcomplete_button"
          icon="/img/mapcomplete.svg"
          iconAlt="MapComplete logo"
          text="Mapcomplete"
        />
      )}
      {props.iD && (
        <Button
          href={props.iD}
          title="iD editor"
          className="id_button"
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
          className="location_button"
          iconText="🎯"
          iconAlt="Location symbol"
          text={t("feature_details.location", "Location")}
        />
      )}
    </div>
  );
};
