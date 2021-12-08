DROP VIEW IF EXISTS "v_element";
DROP TABLE IF EXISTS "wikidata_text";
DROP TABLE IF EXISTS "wikidata_named_after";
DROP TABLE IF EXISTS "wikidata_picture";
DROP TABLE IF EXISTS "etymology";
DROP TABLE IF EXISTS "wikidata";
DROP TABLE IF EXISTS "element_wikidata_ids";
DROP TABLE IF EXISTS "element";
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

CREATE TABLE "element" (
  el_id BIGSERIAL NOT NULL PRIMARY KEY,
  el_osm_type VARCHAR(8) NOT NULL CHECK (el_osm_type IN ('node','way','relation')),
  el_osm_id BIGINT NOT NULL,
  el_name VARCHAR,
  el_wikidata VARCHAR,
  el_subject_wikidata VARCHAR,
  el_name_etymology_wikidata VARCHAR,
  el_geometry GEOMETRY NOT NULL
  --CONSTRAINT element_unique_osm_id UNIQUE (el_osm_type, el_osm_id) --! causes errors, osm2pgsql creates duplicates, see https://dev.openstreetmap.narkive.com/24KCpw1d/osm-dev-osm2pgsql-outputs-neg-and-duplicate-osm-ids-and-weird-attributes-in-table-rels
);

INSERT INTO element (
  el_osm_type,
  el_osm_id,
  el_name,
  el_wikidata,
  el_subject_wikidata,
  el_name_etymology_wikidata,
  el_geometry)
SELECT 'node', osm_id, name, tags->'wikidata', tags->'subject:wikidata', tags->'name:etymology:wikidata', way
FROM planet_osm_point
UNION
SELECT
  CASE WHEN osm_id > 0 THEN 'way' ELSE 'relation' END AS osm_type,
  CASE WHEN osm_id > 0 THEN osm_id ELSE -osm_id END AS osm_id,
  name,
  tags->'wikidata',
  tags->'subject:wikidata',
  tags->'name:etymology:wikidata',
  way AS geom
FROM planet_osm_line
UNION
SELECT
  CASE WHEN osm_id > 0 THEN 'way' ELSE 'relation' END AS osm_type,
  CASE WHEN osm_id > 0 THEN osm_id ELSE -osm_id END AS osm_id,
  name,
  tags->'wikidata',
  tags->'subject:wikidata',
  tags->'name:etymology:wikidata',
  way AS geom
FROM planet_osm_polygon;

CREATE UNIQUE INDEX element_id_idx ON element (el_id) WITH (fillfactor='100');
CREATE INDEX element_geometry_idx ON element USING GIST (el_geometry) WITH (fillfactor='100');

CREATE TABLE "element_wikidata_ids" (
  "ew_id" BIGSERIAL NOT NULL PRIMARY KEY,
  "ew_el_id" BIGINT NOT NULL,
  "ew_wikidata_id" VARCHAR(12) NOT NULL CHECK (LEFT(ew_wikidata_id,1) = 'Q'),
  "ew_etymology" BOOLEAN NOT NULL
);

INSERT INTO element_wikidata_ids (ew_el_id, ew_wikidata_id, ew_etymology)
SELECT el_id, TRIM(wikidata_id), FALSE
FROM element, LATERAL REGEXP_SPLIT_TO_TABLE(el_wikidata,';') AS splitted(wikidata_id)
WHERE LEFT(TRIM(wikidata_id),1) = 'Q'
UNION
SELECT el_id, TRIM(subject_wikidata_id), TRUE
FROM element, LATERAL REGEXP_SPLIT_TO_TABLE(el_subject_wikidata,';') AS splitted(subject_wikidata_id)
WHERE LEFT(TRIM(subject_wikidata_id),1) = 'Q'
UNION
SELECT el_id, TRIM(name_etymology_wikidata_id), TRUE
FROM element, LATERAL REGEXP_SPLIT_TO_TABLE(el_name_etymology_wikidata,';') AS splitted(name_etymology_wikidata_id)
WHERE LEFT(TRIM(name_etymology_wikidata_id),1) = 'Q';

CREATE TABLE "wikidata" (
  "wd_id" SERIAL NOT NULL PRIMARY KEY,
  "wd_wikidata_id" VARCHAR(12) NOT NULL UNIQUE CHECK (LEFT(wd_wikidata_id,1) = 'Q'),
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
  "et_el_id" BIGINT NOT NULL REFERENCES element(el_id),
  "et_wd_id" INT NOT NULL REFERENCES wikidata(wd_id),
  CONSTRAINT etymology_pkey PRIMARY KEY (et_el_id, et_wd_id)
);

CREATE INDEX etymology_id_idx ON etymology (et_el_id) WITH (fillfactor='100');

CREATE TABLE "wikidata_picture" (
  "wdp_id" SERIAL NOT NULL PRIMARY KEY,
  "wdp_wd_id" INT NOT NULL REFERENCES wikidata(wd_id),
  "wdp_picture" VARCHAR NOT NULL
);

CREATE TABLE "wikidata_named_after" (
  wna_wikidata_id VARCHAR(12) NOT NULL REFERENCES wikidata(wd_wikidata_id),
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
