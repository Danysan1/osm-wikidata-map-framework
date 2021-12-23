CREATE FUNCTION translateTimestamp(IN text TEXT)
    RETURNS timestamp without time zone
    LANGUAGE 'sql' AS $BODY$
SELECT CASE
    WHEN $1 IS NULL THEN NULL
    WHEN LEFT($1,1)='-' THEN CONCAT(SUBSTRING($1,2),' BC')::TIMESTAMP
    ELSE $1::TIMESTAMP
END;
$BODY$;

CREATE TABLE "element" (
  el_id BIGSERIAL NOT NULL PRIMARY KEY,
  el_geometry GEOMETRY NOT NULL,
  el_osm_type VARCHAR(8) NOT NULL CHECK (el_osm_type IN ('node','way','relation')),
  el_osm_id BIGINT NOT NULL,
  el_name VARCHAR,
  el_wikidata VARCHAR,
  el_subject_wikidata VARCHAR,
  el_name_etymology_wikidata VARCHAR
  --CONSTRAINT element_unique_osm_id UNIQUE (el_osm_type, el_osm_id) --! causes errors with osm2pgsql as it creates duplicates, see https://dev.openstreetmap.narkive.com/24KCpw1d/osm-dev-osm2pgsql-outputs-neg-and-duplicate-osm-ids-and-weird-attributes-in-table-rels
);

CREATE UNIQUE INDEX element_id_idx ON element (el_id) WITH (fillfactor='100');
CREATE INDEX element_geometry_idx ON element USING GIST (el_geometry) WITH (fillfactor='100');

CREATE TABLE "element_wikidata_cods" (
  "ew_id" BIGSERIAL NOT NULL PRIMARY KEY,
  "ew_el_id" BIGINT NOT NULL,
  "ew_wikidata_cod" VARCHAR(12) NOT NULL CHECK (LEFT(ew_wikidata_cod,1) = 'Q'),
  "ew_etymology" BOOLEAN NOT NULL
);

CREATE TABLE "wikidata" (
  "wd_id" SERIAL NOT NULL PRIMARY KEY,
  "wd_wikidata_cod" VARCHAR(12) NOT NULL UNIQUE CHECK (LEFT(wd_wikidata_cod,1) = 'Q'),
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

CREATE UNIQUE INDEX wikidata_id_idx ON wikidata (wd_id) WITH (fillfactor='100');

CREATE TABLE "etymology" (
  "et_el_id" BIGINT NOT NULL REFERENCES element(el_id),
  "et_wd_id" INT NOT NULL REFERENCES wikidata(wd_id),
  CONSTRAINT etymology_pkey PRIMARY KEY (et_el_id, et_wd_id)
);

CREATE INDEX etymology_el_id_idx ON etymology (et_el_id) WITH (fillfactor='100');

CREATE TABLE "wikidata_picture" (
  "wdp_id" SERIAL NOT NULL PRIMARY KEY,
  "wdp_wd_id" INT NOT NULL REFERENCES wikidata(wd_id),
  "wdp_picture" VARCHAR NOT NULL
);

CREATE INDEX wikidata_picture_id_idx ON wikidata_picture (wdp_wd_id) WITH (fillfactor='100');

CREATE TABLE "wikidata_named_after" (
  wna_wd_id INT NOT NULL REFERENCES wikidata(wd_id),
  wna_named_after_wd_id INT NOT NULL REFERENCES wikidata(wd_id),
  CONSTRAINT wikidata_named_after_pkey PRIMARY KEY (wna_wd_id, wna_named_after_wd_id)
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
  "wdt_prizes" VARCHAR,
  "wdt_event_place" VARCHAR,
  "wdt_birth_place" VARCHAR,
  "wdt_death_place" VARCHAR,
  "wdt_download_date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT wikidata_text_unique_wikidata_language UNIQUE (wdt_wd_id, wdt_language)
);

CREATE INDEX wikidata_text_id_idx ON wikidata_text (wdt_wd_id) WITH (fillfactor='100');
