import { DatePrecision, LinkedEntity } from "@/src/model/LinkedEntity";
import type { LinkedEntityDetails } from "@/src/model/LinkedEntityDetails";
import { WikipediaService } from "@/src/services/WikipediaService";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { EntityButtonRow } from "../ButtonRow/EntityButtonRow";
import { LinkedEntityList } from "../EtymologyList/LinkedEntityList";
import { IIIFImages } from "../IIIFImages/IIIFImages";
import { CommonsImage } from "../ImageWithAttribution/CommonsImage";
import styles from "./EtymologyView.module.css";
import { LinkedEntitySourceRow } from "./LinkedEntitySourceRow";

const MAX_IMAGES = 2;

interface EtymologyViewProps {
  entity: LinkedEntityDetails;
  firstLine?: string;
  entityLinkQID?: string;
}

export const EtymologyView: FC<EtymologyViewProps> = ({ entity, firstLine, entityLinkQID }) => {
  const { i18n, t } = useTranslation(),
    [wikipediaExtract, setWikipediaExtract] = useState<string>();

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat
   */
  const formatDate = useCallback(
    (date: Date | string | number, precision?: DatePrecision): string => {
      let dateObject: Date;
      const options: Intl.DateTimeFormatOptions = {};

      if (date instanceof Date) {
        dateObject = date;
      } else if (typeof date === "string" && date.startsWith("-")) {
        dateObject = new Date(date.slice(1));
        dateObject.setFullYear(-dateObject.getFullYear());
      } else if (typeof date === "string") {
        dateObject = new Date(date);
      } else if (typeof date === "number") {
        // Convert the epoch timestamp to a Date: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#the_ecmascript_epoch_and_timestamps
        dateObject = new Date(date * 1000);
      } else {
        throw new Error("Invalid date parameter");
      }

      if (precision) {
        if (precision >= DatePrecision.second) options.second = "numeric";
        if (precision >= DatePrecision.minute) options.minute = "numeric";
        if (precision >= DatePrecision.hour) options.hour = "numeric";
        if (precision >= DatePrecision.day) options.day = "numeric";
        if (precision >= DatePrecision.month) options.month = "numeric";
        options.year = "numeric";
      }

      if (dateObject < new Date("0000-01-01T00:00:00")) {
        options.era = "short";
      }

      const out = dateObject.toLocaleDateString(i18n.language.split("_")[0], options);
      //console.debug("formatDate", { date, precision, dateObject, options, out });
      return out;
    },
    [i18n.language]
  );

  const startEndDate = useMemo(() => {
    const anyBirthOrDeath =
      !!entity.birth_date ||
      !!entity.birth_place ||
      !!entity.death_date ||
      !!entity.death_place;
    if (anyBirthOrDeath) {
      const birth_date = entity.birth_date
        ? formatDate(entity.birth_date, entity.birth_date_precision)
        : "?",
        birth_place = entity.birth_place?.length ? entity.birth_place : "?",
        death_date = entity.death_date
          ? formatDate(entity.death_date, entity.death_date_precision)
          : "?",
        death_place = entity.death_place?.length ? entity.death_place : "?";
      return `${birth_date} (${birth_place}) - ${death_date} (${death_place})`;
    } else if (!!entity.start_date || !!entity.end_date) {
      const start_date = entity.start_date
        ? formatDate(entity.start_date, entity.start_date_precision)
        : "?",
        end_date = entity.end_date
          ? formatDate(entity.end_date, entity.end_date_precision)
          : "?";
      return `${start_date} - ${end_date}`;
    } else if (entity.event_date) {
      return formatDate(entity.event_date, entity.event_date_precision);
    } else {
      return null;
    }
  }, [
    entity.birth_date,
    entity.birth_date_precision,
    entity.birth_place,
    entity.death_date,
    entity.death_date_precision,
    entity.death_place,
    entity.end_date,
    entity.end_date_precision,
    entity.event_date,
    entity.event_date_precision,
    entity.start_date,
    entity.start_date_precision,
    formatDate,
  ]);

  useEffect(() => {
    if (!entity.wikipedia) {
      setWikipediaExtract(undefined);
      return;
    }

    new WikipediaService()
      .fetchExtract(entity.wikipedia, i18n.language)
      .then((res) => {
        console.debug("Fetched linked entity Wikipedia extract: ", entity.wikipedia);
        setWikipediaExtract(res);
      })
      .catch((e) => {
        console.error(
          "Failed fetching linked entity Wikipedia extract",
          entity.wikipedia,
          e
        );
        setWikipediaExtract(undefined);
      });
  }, [entity.wikipedia, i18n.language]);

  const parts = useMemo((): LinkedEntity[] | undefined => {
    if (!entity.parts) return undefined;

    if (entity.from_parts_of_wikidata_cod) {
      console.debug("Not fetching parts of parts", entity);
      return undefined;
    }

    return entity.parts.map(
      (qid): LinkedEntity => ({
        ...entity,
        wikidata: qid,
        from_parts_of_wikidata_cod: entity.wikidata,
        parts: undefined,
      })
    );
  }, [entity]);

  const statementEntities = useMemo<LinkedEntity[]>(
    () =>
      !entityLinkQID
        ? []
        : [
          {
            wikidata: entityLinkQID,
            from_wikidata_entity: entity.from_wikidata_entity,
            from_wikidata_prop: entity.from_wikidata_prop,
          },
        ],
    [entity.from_wikidata_entity, entity.from_wikidata_prop, entityLinkQID]
  );

  if (!entity.name && !entity.description && !entity.wikidata) {
    console.warn("Not showing linked entity without name, description nor Wikidata");
    return null;
  }

  return (
    <div className={styles.entity}>
      <div className={styles.entity_grid}>
        <div className={styles.entity_info_column}>
          {!!firstLine && <p>{firstLine}</p>}

          {entity.linkPicture && (
            <CommonsImage name={entity.linkPicture} className={styles.entity_image} />
          )}

          <h2 className={styles.entity_name}>{entity.name}</h2>
          <h3 className={styles.entity_description}>{entity.description}</h3>

          <EntityButtonRow entity={entity} />

          {wikipediaExtract && (
            <p className={styles.wikipedia_extract}>📖 {wikipediaExtract}</p>
          )}
          {startEndDate && <p className="start_end_date">📅 {startEndDate}</p>}
          {entity.event_place && <p className="event_place">📍 {entity.event_place}</p>}
          {entity.citizenship && <p className="citizenship">🌍 {entity.citizenship}</p>}
          {entity.gender && <p className="gender">⚧️ {entity.gender}</p>}
          {entity.occupations && <p className="occupations">🛠️ {entity.occupations}</p>}
          {entity.prizes && <p className="prizes">🏆 {entity.prizes}</p>}
        </div>

        <div className={styles.entity_pictures_column}>
          {entity.pictures?.slice(0, MAX_IMAGES)?.map((img, i) => (
            <CommonsImage key={i} name={img} className={styles.entity_image} />
          ))}
          {entity.iiif_url && (
            <IIIFImages manifestURL={entity.iiif_url} className={styles.entity_image} />
          )}
        </div>
      </div>

      <LinkedEntitySourceRow {...entity} />

      {!!parts?.length && <LinkedEntityList linkedEntities={parts} />}

      {!!statementEntities?.length && (
        <LinkedEntityList
          linkedEntities={statementEntities}
          firstLine={t("etymology_details.more_details")}
        />
      )}
    </div>
  );
};
