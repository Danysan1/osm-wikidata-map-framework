import { Etymology } from "@/src/model/Etymology";
import { DatePrecision, EtymologyDetails } from "@/src/model/EtymologyDetails";
import { WikipediaService } from "@/src/services/WikipediaService";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { EtymologyButtonRow } from "../ButtonRow/EtymologyButtonRow";
import { CommonsImage } from "../ImageWithAttribution/CommonsImage";
import { EtymologyList } from "./EtymologyList";
import styles from "./EtymologyList.module.css";

interface EtymologyViewProps {
  etymology: EtymologyDetails;
}

export const EtymologyView: React.FC<EtymologyViewProps> = ({ etymology }) => {
  const { t, i18n } = useTranslation(),
    [wikipediaExtract, setWikipediaExtract] = useState<string>(),
    osmUrlA =
      (etymology.osm_wd_join_field === "OSM" ||
        !!etymology.from_osm ||
        etymology.propagated) &&
      etymology.from_osm_type &&
      etymology.from_osm_id
        ? `https://www.openstreetmap.org/${etymology.from_osm_type}/${etymology.from_osm_id}`
        : null,
    wdUrlA =
      etymology.osm_wd_join_field &&
      etymology.osm_wd_join_field !== "OSM" &&
      etymology.from_wikidata_entity
        ? `https://www.wikidata.org/wiki/${etymology.from_wikidata_entity}#${etymology.osm_wd_join_field}`
        : null,
    wdUrlB = etymology.from_wikidata_entity
      ? `https://www.wikidata.org/wiki/${etymology.from_wikidata_entity}#${
          etymology.from_wikidata_prop ?? ""
        }`
      : null,
    showArrow = (!!osmUrlA || !!wdUrlA) && wdUrlB,
    wdUrlPartOf = etymology.from_parts_of_wikidata_cod
      ? `https://www.wikidata.org/wiki/${etymology.from_parts_of_wikidata_cod}#P527`
      : null,
    wdUrlC = `https://www.wikidata.org/wiki/${etymology.wikidata}`;

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

      const out = dateObject.toLocaleDateString(i18n.language, options);
      //if (process.env.NODE_ENV === 'development') console.debug("formatDate", { date, precision, dateObject, options, out });
      return out;
    },
    [i18n.language]
  );

  const startEndDate = useMemo(() => {
    if (
      !!etymology.birth_date ||
      !!etymology.birth_place ||
      !!etymology.death_date ||
      etymology.death_place
    ) {
      const birth_date = etymology.birth_date
          ? formatDate(etymology.birth_date, etymology.birth_date_precision)
          : "?",
        birth_place = etymology.birth_place ? etymology.birth_place : "?",
        death_date = etymology.death_date
          ? formatDate(etymology.death_date, etymology.death_date_precision)
          : "?",
        death_place = etymology.death_place ? etymology.death_place : "?";
      return `${birth_date} (${birth_place}) - ${death_date} (${death_place})`;
    } else if (!!etymology.start_date || etymology.end_date) {
      const start_date = etymology.start_date
          ? formatDate(etymology.start_date, etymology.start_date_precision)
          : "?",
        end_date = etymology.end_date
          ? formatDate(etymology.end_date, etymology.end_date_precision)
          : "?";
      return `${start_date} - ${end_date}`;
    } else if (etymology.event_date) {
      return formatDate(etymology.event_date, etymology.event_date_precision);
    } else {
      return null;
    }
  }, [
    etymology.birth_date,
    etymology.birth_date_precision,
    etymology.birth_place,
    etymology.death_date,
    etymology.death_date_precision,
    etymology.death_place,
    etymology.end_date,
    etymology.end_date_precision,
    etymology.event_date,
    etymology.event_date_precision,
    etymology.start_date,
    etymology.start_date_precision,
    formatDate,
  ]);

  useEffect(() => {
    if (etymology.wikipedia) {
      new WikipediaService()
        .fetchExtract(etymology.wikipedia)
        .then((res) => setWikipediaExtract(res))
        .catch(console.error);
    }
  }, [etymology.wikipedia]);

  const parts = useMemo((): Etymology[] | undefined => {
    if (etymology.from_parts_of_wikidata_cod) {
      if (process.env.NODE_ENV === "development")
        console.debug("Not fetching parts of parts", etymology);
      return undefined;
    }

    if (etymology.statementEntity) {
      return [
        {
          ...etymology,
          wikidata: etymology.statementEntity,
          from_statement_of_wikidata_cod: etymology.wikidata,
        },
      ];
    }

    return etymology.parts?.map(
      (qid): Etymology => ({
        ...etymology,
        wikidata: qid,
        from_parts_of_wikidata_cod: etymology.wikidata,
      })
    );
  }, [etymology]);

  return (
    <div className={styles.etymology}>
      <div className={styles.grid_auto}>
        <div className="column">
          <div className="header column etymology_header">
            <h2 className="etymology_name">{etymology.name}</h2>
            <h3 className="etymology_description">{etymology.description}</h3>
          </div>
          <div className="info column">
            <EtymologyButtonRow etymology={etymology} />

            {wikipediaExtract && (
              <p className="wikipedia_extract">📖 {wikipediaExtract}</p>
            )}
            {startEndDate && <p className="start_end_date">📅 {startEndDate}</p>}
            {etymology.event_place && (
              <p className="event_place">📍 {etymology.event_place}</p>
            )}
            {etymology.citizenship && (
              <p className="citizenship">🌍 {etymology.citizenship}</p>
            )}
            {etymology.gender && <p className="gender">⚧️ {etymology.gender}</p>}
            {etymology.occupations && (
              <p className="occupations">🛠️ {etymology.occupations}</p>
            )}
            {etymology.prizes && <p className="prizes">🏆 {etymology.prizes}</p>}
          </div>
        </div>

        {!!etymology.pictures?.length && (
          <div className="etymology_pictures column">
            {etymology.pictures.map((img, i) => (
              <CommonsImage key={i} name={img} className={styles.etymology_image} />
            ))}
          </div>
        )}
      </div>

      <span className="etymology_src_wrapper">
        {t("feature_details.source")}&nbsp;
        {osmUrlA && (
          <a className="etymology_src_a" href={osmUrlA}>
            OpenStreetMap&nbsp;
          </a>
        )}
        {wdUrlA && (
          <a className="etymology_src_a" href={wdUrlA}>
            Wikidata&nbsp;
          </a>
        )}
        {showArrow && <span className="src_osm_plus_wd">&gt;&nbsp;</span>}
        {wdUrlB && (
          <a className="etymology_src_wd" href={wdUrlB}>
            Wikidata&nbsp;
          </a>
        )}
        {etymology.propagated && (
          <span className="etymology_propagated_wrapper">
            &gt;&nbsp;
            <a
              title={t("etymology_details.propagation")}
              href={process.env.owmf_propagation_docs_url}
            >
              {t("etymology_details.propagation")}
            </a>
            &nbsp;
          </span>
        )}
        {wdUrlPartOf && (
          <span className="etymology_src_part_of_wd_wrapper">
            &gt;&nbsp;
            <a className="etymology_src_part_of_wd" href={wdUrlPartOf}>
              Wikidata
            </a>
            &nbsp;
          </span>
        )}
        &gt;&nbsp;
        <a className="etymology_src_entity" href={wdUrlC}>
          Wikidata
        </a>
      </span>
      <div className="etymology_parts_container">
        {!!parts?.length && <EtymologyList etymologies={parts} />}
      </div>
    </div>
  );
};
