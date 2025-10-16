import { getPropLinkedEntities } from "@/src/model/OwmfFeatureProperties";
import { getFeatureTags, OwmfFeature } from "@/src/model/OwmfResponse";
import { SourcePreset } from "@/src/model/SourcePreset";
import { WikidataDescriptionService } from "@/src/services/WikidataDescriptionService";
import { WikidataLabelService } from "@/src/services/WikidataLabelService";
import { WikipediaService } from "@/src/services/WikipediaService";
import { FC, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";
import { FeatureButtonRow } from "../ButtonRow/FeatureButtonRow";
import { LinkedEntityList } from "../EtymologyList/LinkedEntityList";
import { FeatureImages } from "../ImageWithAttribution/FeatureImage";
import { FeatureSourceRow } from "./FeatureSourceRow";
import styles from "./FeatureView.module.css";

interface FeatureViewProps {
  feature: OwmfFeature;
  preset: SourcePreset;
}

export const FeatureView: FC<FeatureViewProps> = ({ feature, preset }) => {
  const { t, i18n } = useTranslation(),
    [wikipediaExtract, setWikipediaExtract] = useState<string>(),
    props = feature.properties,
    featureI18n = getFeatureTags(feature),
    [mainName, setMainName] = useState<string>(),
    altNames = useMemo(() => {
      if (!featureI18n) return undefined;

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
    }, [featureI18n, mainName]),
    [description, setDescription] = useState<string>();

  useEffect(() => {
    const local_name = featureI18n?.["name:" + i18n.language],
      fallback_name = featureI18n?.["name:en"];

    if (typeof local_name === "string" && local_name !== "null") {
      setMainName(local_name);
    } else if (featureI18n?.name && featureI18n.name !== "null") {
      setMainName(featureI18n.name);
    } else if (typeof fallback_name === "string" && fallback_name !== "null") {
      setMainName(fallback_name);
    } else if (featureI18n?.official_name && featureI18n.official_name !== "null") {
      setMainName(featureI18n.official_name);
    } else if (featureI18n?.alt_name && featureI18n.alt_name !== "null") {
      setMainName(featureI18n.alt_name);
    } else if (props?.wikidata) {
      const labelService = new WikidataLabelService();
      labelService
        .getSomeLabelFromWikidataID(props.wikidata, i18n.language)
        .then((label) => {
          if (label) {
            console.debug("Found label from Wikidata", { qid: props.wikidata, label });
            setMainName(label);
          }
        })
        .catch(() => {
          console.warn("Failed getting label from Wikidata", { qid: props.wikidata });
        });
    } else if (featureI18n?.ref && featureI18n.ref !== "null") {
      setMainName(featureI18n.ref);
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
            console.debug("Found description from Wikidata", {
              qid: props.wikidata,
              desc,
            });
            setDescription(desc);
          }
        })
        .catch(() => {
          console.warn("Failed getting description from Wikidata", {
            qid: props.wikidata,
          });
        });
    }
  }, [featureI18n?.description, i18n.language, props]);

  useEffect(() => {
    if (!feature.properties?.wikipedia?.startsWith(i18n.language)) {
      console.debug("Skipping fetching feature Wikipedia extract: ", feature.properties?.wikipedia);
      setWikipediaExtract(undefined);
    } else {
      new WikipediaService()
        .fetchExtract(feature.properties?.wikipedia)
        .then((res) => {
          console.debug(
            "Fetched feature Wikipedia extract: ",
            feature.properties?.wikipedia
          );
          setWikipediaExtract(res);
        })
        .catch((e) => {
          console.error(
            "Failed fetching feature Wikipedia extract: ",
            feature.properties?.wikipedia,
            e
          );
          setWikipediaExtract(undefined);
        });
    }
  }, [feature.properties?.wikipedia, i18n.language]);

  return (
    <div className={styles.detail_container}>
      {!!mainName && <h3 className={styles.element_name}>📍 {mainName}</h3>}
      {!!altNames?.length && (
        <p className={styles.element_alt_names}>
          {altNames.map((name) => '"' + name + '"').join(" / ")}
        </p>
      )}
      {description && <p className={styles.element_description}>{description}</p>}
      <div className={styles.feature_buttons_container}>
        <FeatureButtonRow feature={feature} preset={preset} />
      </div>
      {wikipediaExtract && (
        <p className={styles.wikipedia_extract}>📖 {wikipediaExtract}</p>
      )}
      {props && <FeatureImages feature={props} className={styles.feature_images} />}

      {props?.linked_entities && (
        <LinkedEntityList linkedEntities={getPropLinkedEntities(props)} />
      )}

      <Button
        title={t("feature_details.report_problem")}
        className="ety_error_button"
        href={`/${i18n.language}/contributing/${preset.id}`}
        iconText="⚠️"
        iconAlt="Problem symbol"
        showText
        text={t("feature_details.report_problem")}
      />

      {props && <FeatureSourceRow {...props} />}
    </div>
  );
};
