CREATE EXTENSION IF NOT EXISTS hstore;

DROP TABLE IF EXISTS "wikidata_text";
DROP TABLE IF EXISTS "wikidata_named_after";
DROP TABLE IF EXISTS "wikidata";

CREATE TABLE "wikidata" (
  "wd_id" SERIAL NOT NULL PRIMARY KEY,
  "wd_wikidata_id" VARCHAR(10) NOT NULL,
  "wd_wkt" VARCHAR,
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
  "wd_commons_url" VARCHAR,
  "wd_download_date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "wikidata_named_after" (
  wd_id_a INT NOT NULL,
  wd_id_b INT NOT NULL,
  CONSTRAINT "wd_named_after_id_a" FOREIGN KEY ("wd_id_a") REFERENCES "wikidata" ("wd_id") ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "wd_named_after_id_b" FOREIGN KEY ("wd_id_b") REFERENCES "wikidata" ("wd_id") ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE TABLE "wikidata_text" (
  "wdt_id" SERIAL NOT NULL PRIMARY KEY,
  "wdt_wd_id" INT NOT NULL,
  "wdt_language" CHAR(2),
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
  CONSTRAINT "wdt_ety" FOREIGN KEY ("wdt_wd_id") REFERENCES "wikidata" ("wd_id") ON DELETE CASCADE ON UPDATE NO ACTION
);