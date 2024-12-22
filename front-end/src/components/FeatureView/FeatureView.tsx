import { useUrlFragmentContext } from "@/src/context/UrlFragmentContext";
import { getFeatureTags, OwmfFeature } from "@/src/model/OwmfResponse";
import { WikidataDescriptionService } from "@/src/services/WikidataDescriptionService";
import { WikidataLabelService } from "@/src/services/WikidataLabelService";
import { WikidataStatementService } from "@/src/services/WikidataStatementService";
import { useEffect, useMemo, useState, FC } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";
import { FeatureButtonRow } from "../ButtonRow/FeatureButtonRow";
import { EtymologyList } from "../EtymologyList/EtymologyList";
import { CommonsImage } from "../ImageWithAttribution/CommonsImage";
import styles from "./FeatureView.module.css";

interface FeatureViewProps {
  feature: OwmfFeature;
}

export const FeatureView: FC<FeatureViewProps> = ({ feature }) => {
  const { t, i18n } = useTranslation(),
    { sourcePresetID } = useUrlFragmentContext(),
    props = feature.properties,
    featureI18n = getFeatureTags(feature),
    osm_full_id =
      props?.osm_type && props.osm_id ? props.osm_type + "/" + props.osm_id : null,
    fromOsmUrl =
      props?.from_osm && osm_full_id
        ? `https://www.openstreetmap.org/${osm_full_id}`
        : undefined,
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    fromWdEntity = props?.from_wikidata_entity || props?.wikidata,
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    fromWdProperty = props?.from_wikidata_prop || "P625",
    fromWikidataUrl =
      props?.from_wikidata && fromWdEntity
        ? `https://www.wikidata.org/wiki/${fromWdEntity}#${fromWdProperty}`
        : undefined,
    [mainName, setMainName] = useState<string>(),
    altNames = useMemo(() => {
      const alt_name_set = new Set<string>();
      [featureI18n.name, featureI18n.official_name, featureI18n.alt_name]
        .flatMap((name) => name?.split(";"))
        .map((name) => name?.trim())
        .filter(
          (name) =>
            name &&
            name !== "null" &&
            (!mainName || name.toLowerCase() !== mainName.toLowerCase())
        )
        .forEach((name) => alt_name_set.add(name!)); // deduplicates alt names
      return alt_name_set.size > 0 ? Array.from(alt_name_set) : undefined;
    }, [mainName, featureI18n.alt_name, featureI18n.name, featureI18n.official_name]),
    [description, setDescription] = useState<string>(),
    [commons, setCommons] = useState<string[]>();

  useEffect(() => {
    const local_name = featureI18n["name:" + i18n.language],
      fallback_name = featureI18n["name:en"];

    if (typeof local_name === "string" && local_name !== "null") {
      setMainName(local_name);
    } else if (featureI18n.name && featureI18n.name !== "null") {
      setMainName(featureI18n.name);
    } else if (typeof fallback_name === "string" && fallback_name !== "null") {
      setMainName(fallback_name);
    } else if (featureI18n.official_name && featureI18n.official_name !== "null") {
      setMainName(featureI18n.official_name);
    } else if (featureI18n.alt_name && featureI18n.alt_name !== "null") {
      setMainName(featureI18n.alt_name);
    } else if (props?.wikidata) {
      setMainName(undefined);
      const labelService = new WikidataLabelService();
      labelService
        .getSomeLabelFromWikidataID(props.wikidata, i18n.language)
        .then((label) => {
          if (label) {
            if (process.env.NODE_ENV === "development")
              console.debug("Found label from Wikidata", { qid: props.wikidata, label });
            setMainName(label);
          }
        })
        .catch(() => {
          if (process.env.NODE_ENV === "development")
            console.warn("Failed getting label from Wikidata", { qid: props.wikidata });
        });
    } else {
      setMainName(undefined);
    }
  }, [featureI18n, i18n.language, props]);

  useEffect(() => {
    if (featureI18n?.description && featureI18n.description !== "null") {
      setDescription(featureI18n.description);
    } else if (props?.wikidata) {
      const descriptionService = new WikidataDescriptionService();
      descriptionService
        .getDescriptionFromWikidataID(props.wikidata, i18n.language)
        .then((desc) => {
          if (desc) {
            if (process.env.NODE_ENV === "development")
              console.debug("Found description from Wikidata", {
                qid: props.wikidata,
                desc,
              });
            setDescription(desc);
          }
        })
        .catch(() => {
          if (process.env.NODE_ENV === "development")
            console.warn("Failed getting description from Wikidata", {
              qid: props.wikidata,
            });
        });
    }
  }, [featureI18n.description, i18n.language, props]);

  useEffect(() => {
    if (props?.commons?.includes("File:")) {
      setCommons([props.commons]);
    } else if (props?.picture?.includes("File:")) {
      setCommons([props.picture]);
    } else if (props?.wikidata) {
      const statementService = new WikidataStatementService();
      statementService
        .getCommonsImageFromWikidataID(props.wikidata)
        .then((image) => {
          if (image) {
            if (process.env.NODE_ENV === "development")
              console.debug("Found image from Wikidata", { props, image });
            setCommons([image]);
          }
        })
        .catch(() => {
          console.warn("Failed getting image from Wikidata", props);
        });
    }
  }, [props]);

  if (process.env.NODE_ENV === "development")
    console.debug("FeatureView", {
      feature,
      mainName,
      altNames,
      description,
      commons,
      fromOsmUrl,
      fromWikidataUrl,
    });
  return (
    <div className={styles.detail_container}>
      <h3 className={styles.element_name}>📍 {mainName}</h3>
      {!!altNames?.length && (
        <p className={styles.element_alt_names}>
          {altNames.map((name) => '"' + name + '"').join(" / ")}
        </p>
      )}
      {description && <p className={styles.element_description}>{description}</p>}
      <div className={styles.feature_buttons_container}>
        <FeatureButtonRow feature={feature} />
      </div>
      {!!commons?.length && (
        <div className="feature_pictures column">
          {commons.map((img, i) => (
            <CommonsImage key={i} name={img} />
          ))}
        </div>
      )}

      {(!!props?.linked_entities || props?.text_etymology) && <EtymologyList
        wdLinkedEntities={props.linked_entities ?? []}
        text_etymology={props.text_etymology}
        text_etymology_descr={props.text_etymology_descr}
        from_osm_id={props.osm_id}
        from_osm_type={props.osm_type}
      />}

      <Button
        title={t("feature_details.report_problem")}
        className="ety_error_button"
        href={`/${i18n.language}/contributing/${sourcePresetID}`}
        iconText="⚠️"
        iconAlt="Problem symbol"
        showText
        text={t("feature_details.report_problem")}
      />

      <div className="feature_src_wrapper">
        {t("feature_details.source")}&nbsp;
        {fromOsmUrl && (
          <a className="feature_src_osm" href={fromOsmUrl}>
            OpenStreetMap
          </a>
        )}
        {fromOsmUrl && fromWikidataUrl && <span className="src_osm_and_wd">&nbsp;&</span>}
        {fromWikidataUrl && (
          <a className="feature_src_wd" href={fromWikidataUrl}>
            &nbsp;Wikidata
          </a>
        )}
      </div>
    </div>
  );
};
