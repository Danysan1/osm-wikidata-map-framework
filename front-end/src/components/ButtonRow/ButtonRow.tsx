import mapcompleteLogo from "@/src/img/mapcomplete.svg";
import iDEditorLogo from "@/src/img/OpenStreetMap-Editor_iD_Logo.svg";
import osmWdMatcherLogo from "@/src/img/osm-wd-matcher.png";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";
import styles from "./ButtonRow.module.css";
import commonsLogo from "./img/Commons-logo.svg";
import entitreeLogo from "./img/entitree.png";
import openStreetMapLogo from "./img/Openstreetmap_logo.svg";
import wikidataLogo from "./img/Wikidata.svg";
import wikipediaLogo from "./img/Wikipedia-logo-v2.svg";
import wikisporeLogo from "./img/Wikispore_logo_without_text.svg";

interface ButtonRowProps {
  commons?: string;
  entitreeURL?: string;
  iDEditorURL?: string;
  location?: string | (() => void);
  mapcompleteURL?: string;
  openstreetmapURL?: string;
  osmWikidataMatcherURL?: string;
  websiteURL?: string;
  wikidata?: string;
  wikipedia?: string;
  wikispore?: string;
  className?: string;
  onOpenInfo?: () => void;
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
    }, [props.commons]),
    wikidataURL = useMemo(() => {
      if (!props.wikidata || props.wikidata === "null")
        return undefined;

      if (props.wikidata.startsWith("http"))
        return props.wikidata;

      return `https://www.wikidata.org/wiki/${props.wikidata}`;
    }, [props.wikidata]),
    wikipediaURL = useMemo(() => {
      if (!props.wikipedia || props.wikipedia === "null")
        return undefined;

      if (props.wikipedia.startsWith("http"))
        return props.wikipedia;

      return `https://www.wikipedia.org/wiki/${props.wikipedia}`;
    }, [props.wikipedia]),
    wikisporeURL = useMemo(() => {
      if (process.env.owmf_wikispore_enable !== "true" || !props.wikispore || props.wikispore === "null")
        return undefined;

      if (props.wikispore.startsWith("http"))
        return props.wikispore;

      return `https://wikispore.wmflabs.org/wiki/${props.wikispore}`;
    }, [props.wikispore]);

  return (
    <div className={`${styles.button_row} ${props.className}`}>
      {props.onOpenInfo && (
        <Button
          onClick={props.onOpenInfo}
          title="More info"
          className="info_button"
          iconText="ℹ️"
          iconAlt="Information symbol"
          text="More info"
        />
      )}
      {wikipediaURL && (
        <Button
          href={wikipediaURL}
          title="Wikipedia"
          className="wikipedia_button"
          icon={wikipediaLogo as StaticImport}
          iconAlt="Wikipedia logo"
          text="Wikipedia"
        />
      )}
      {wikisporeURL && (
        <Button
          href={wikisporeURL}
          title="Wikispore"
          className="wikispore_button"
          icon={wikisporeLogo as StaticImport}
          iconAlt="Wikispore logo"
          text="Wikispore"
        />
      )}
      {commonsURL && (
        <Button
          href={commonsURL}
          title="Wikimedia Commons"
          className="commons_button"
          icon={commonsLogo as StaticImport}
          iconAlt="Wikimedia Commons logo"
          text="Commons"
        />
      )}
      {wikidataURL && (
        <Button
          href={wikidataURL}
          title="Wikidata"
          className="wikidata_button"
          icon={wikidataLogo as StaticImport}
          iconAlt="Wikidata logo"
          text="Wikidata"
        />
      )}
      {props.openstreetmapURL && (
        <Button
          href={props.openstreetmapURL}
          title="OpenStreetMap"
          className="osm_button"
          icon={openStreetMapLogo as StaticImport}
          iconAlt="OpenStreetMap logo"
          text="OpenStreetMap"
        />
      )}
      {props.websiteURL && (
        <Button
          href={props.websiteURL}
          title="Official website"
          className="website_button"
          iconText="🌐"
          iconAlt="Official website symbol"
          text="Website"
        />
      )}
      {props.osmWikidataMatcherURL && (
        <Button
          href={props.osmWikidataMatcherURL}
          title="OSM ↔ Wikidata matcher"
          className="matcher_button"
          icon={osmWdMatcherLogo as StaticImport}
          iconAlt="OSM ↔ Wikidata matcher logo"
          text="OSM ↔ Wikidata matcher"
        />
      )}
      {props.mapcompleteURL && (
        <Button
          href={props.mapcompleteURL}
          title="MapComplete"
          className="mapcomplete_button"
          icon={mapcompleteLogo as StaticImport}
          iconAlt="MapComplete logo"
          text="Mapcomplete"
        />
      )}
      {props.iDEditorURL && (
        <Button
          href={props.iDEditorURL}
          title="iD editor"
          className="id_button"
          icon={iDEditorLogo as StaticImport}
          iconAlt="iD editor logo"
          text="iD editor"
        />
      )}
      {props.entitreeURL && (
        <Button
          href={props.entitreeURL}
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
