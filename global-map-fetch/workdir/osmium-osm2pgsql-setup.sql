DROP TABLE IF EXISTS "wikidata_text";
DROP TABLE IF EXISTS "wikidata_named_after";
DROP TABLE IF EXISTS "wikidata_picture";
DROP TABLE IF EXISTS "wikidata";

CREATE TABLE "wikidata" (
  "wd_id" SERIAL NOT NULL PRIMARY KEY,
  "wd_wikidata_id" VARCHAR(10) NOT NULL UNIQUE,
  "wd_position" GEOMETRY,
  "wd_event_date" TIMESTAMP,
  "wd_event_date_precision" INT,
  "wd_start_date" TIMESTAMP,
  "wd_start_date_precision" INT,
  "wd_end_date" TIMESTAMP,
  "wd_end_date_precision" INT,
  "wd_birth_date" TIMESTAMP,
  "wd_birth_date_precision" INT,
  "wd_death_date" TIMESTAMP,
  "wd_death_date_precision" INT,
  "wd_commons" VARCHAR,
  "wd_download_date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "wikidata_picture" (
  "wdp_id" SERIAL NOT NULL PRIMARY KEY,
  "wdp_wd_id" INT NOT NULL,
  "wdp_picture" VARCHAR NOT NULL,
  CONSTRAINT "wd_picture_wd_id_fkey" FOREIGN KEY ("wdp_wd_id") REFERENCES "wikidata" ("wd_id") ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE TABLE "wikidata_named_after" (
  wd_wikidata_id VARCHAR(10) NOT NULL,
  wd_wikidata_named_after_id VARCHAR(10) NOT NULL,
  CONSTRAINT wikidata_named_after_pkey PRIMARY KEY (wd_wikidata_id, wd_wikidata_named_after_id),
  CONSTRAINT "wd_named_after_id_fkey" FOREIGN KEY ("wd_wikidata_named_after_id") REFERENCES "wikidata" ("wd_wikidata_id") ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE TABLE "wikidata_text" (
  "wdt_id" SERIAL NOT NULL PRIMARY KEY,
  "wdt_wd_id" INT NOT NULL,
  "wdt_language" CHAR(2) NOT NULL,
  "wdt_name" VARCHAR,
  "wdt_description" VARCHAR,
  "wdt_gender" VARCHAR,
  "wdt_wikipedia_url" VARCHAR,
  "wdt_occupations" VARCHAR,
  "wdt_citizenship" VARCHAR,
  "wdt_pictures" VARCHAR,
  "wdt_prizes" VARCHAR,
  "wdt_event_place" VARCHAR,
  "wdt_birth_place" VARCHAR,
  "wdt_death_place" VARCHAR,
  "wdt_download_date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wdt_wd_id_fkey" FOREIGN KEY ("wdt_wd_id") REFERENCES "wikidata" ("wd_id") ON DELETE CASCADE ON UPDATE NO ACTION
);

DROP FUNCTION IF EXISTS public.translateTimestamp;
CREATE FUNCTION public.translateTimestamp(IN text TEXT)
    RETURNS timestamp without time zone
    LANGUAGE 'sql' AS $BODY$
SELECT CASE
    WHEN $1 IS NULL THEN NULL
    WHEN LEFT($1,1)='-' THEN CONCAT(SUBSTRING($1,2),' BC')::TIMESTAMP
    ELSE $1::TIMESTAMP
END;
$BODY$;

DROP VIEW IF EXISTS public."element";
CREATE VIEW public."element" AS
SELECT
  way AS geometry,
  'node' AS osm_type,
  osm_id
FROM public."planet_osm_point"
UNION
SELECT
  way AS geometry,
  'way' AS osm_type,
  osm_id
FROM public."planet_osm_line"
UNION
SELECT
  way AS geometry,
  'relation' AS osm_type,
  osm_id
FROM public."planet_osm_line";
