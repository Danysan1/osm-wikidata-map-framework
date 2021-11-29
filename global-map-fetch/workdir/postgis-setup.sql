DROP VIEW IF EXISTS "v_element";
DROP TABLE IF EXISTS "wikidata_text";
DROP TABLE IF EXISTS "wikidata_named_after";
DROP TABLE IF EXISTS "wikidata_picture";
DROP TABLE IF EXISTS "etymology";
DROP TABLE IF EXISTS "wikidata";

CREATE TABLE "wikidata" (
  "wd_id" SERIAL NOT NULL PRIMARY KEY,
  "wd_wikidata_id" VARCHAR(12) NOT NULL UNIQUE,
  "wd_position" GEOMETRY,
  --"wd_event_date" TIMESTAMP,
  "wd_event_date" VARCHAR,
  "wd_event_date_precision" INT,
  --"wd_start_date" TIMESTAMP,
  "wd_start_date" VARCHAR,
  "wd_start_date_precision" INT,
  --"wd_end_date" TIMESTAMP,
  "wd_end_date" VARCHAR,
  "wd_end_date_precision" INT,
  --"wd_birth_date" TIMESTAMP,
  "wd_birth_date" VARCHAR,
  "wd_birth_date_precision" INT,
  --"wd_death_date" TIMESTAMP,
  "wd_death_date" VARCHAR,
  "wd_death_date_precision" INT,
  "wd_commons" VARCHAR,
  "wd_gender_id" INT REFERENCES wikidata(wd_id),
  "wd_instance_id" INT REFERENCES wikidata(wd_id),
  "wd_download_date" TIMESTAMP DEFAULT NULL
);

CREATE TABLE "etymology" (
  "et_id" SERIAL NOT NULL PRIMARY KEY,
  "et_type" VARCHAR(7),
  "et_osm_id" BIGINT,
  "et_wd_id" INT REFERENCES wikidata(wd_id),
  CONSTRAINT etymolgy_unique_element_wikidata UNIQUE (et_type, et_osm_id, et_wd_id)
);

CREATE INDEX IF NOT EXISTS wd_wikidata_id_index
    ON wikidata USING btree
    (wd_wikidata_id COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE TABLE "wikidata_picture" (
  "wdp_id" SERIAL NOT NULL PRIMARY KEY,
  "wdp_wd_id" INT NOT NULL REFERENCES wikidata(wd_id),
  "wdp_picture" VARCHAR NOT NULL
);

CREATE TABLE "wikidata_named_after" (
  wna_wikidata_id VARCHAR(12) NOT NULL,
  wna_named_after_wikidata_id VARCHAR(12) NOT NULL REFERENCES wikidata(wd_wikidata_id),
  CONSTRAINT wikidata_named_after_pkey PRIMARY KEY (wna_wikidata_id, wna_named_after_wikidata_id)
);

CREATE TABLE "wikidata_text" (
  "wdt_id" SERIAL NOT NULL PRIMARY KEY,
  "wdt_wd_id" INT NOT NULL REFERENCES wikidata(wd_id),
  "wdt_language" CHAR(2) NOT NULL,
  "wdt_name" VARCHAR,
  "wdt_description" VARCHAR,
  "wdt_wikipedia_url" VARCHAR,
  "wdt_occupations" VARCHAR,
  "wdt_citizenship" VARCHAR,
  "wdt_pictures" VARCHAR,
  "wdt_prizes" VARCHAR,
  "wdt_event_place" VARCHAR,
  "wdt_birth_place" VARCHAR,
  "wdt_death_place" VARCHAR,
  "wdt_download_date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT wikidata_text_unique_wikidata_language UNIQUE (wdt_wd_id, wdt_language)
);

DROP FUNCTION IF EXISTS translateTimestamp;
CREATE FUNCTION translateTimestamp(IN text TEXT)
    RETURNS timestamp without time zone
    LANGUAGE 'sql' AS $BODY$
SELECT CASE
    WHEN $1 IS NULL THEN NULL
    WHEN LEFT($1,1)='-' THEN CONCAT(SUBSTRING($1,2),' BC')::TIMESTAMP
    ELSE $1::TIMESTAMP
END;
$BODY$;
