CREATE SCHEMA IF NOT EXISTS oem;

DROP TABLE IF EXISTS oem.wikidata_text;

DROP TABLE IF EXISTS oem.wikidata_picture;

DROP TABLE IF EXISTS oem.etymology;

DROP TABLE IF EXISTS oem.wikidata;

DROP TABLE IF EXISTS oem.element_wikidata_cods;

DROP TABLE IF EXISTS oem.element;

DROP TABLE IF EXISTS oem.osmdata;

DROP FUNCTION IF EXISTS oem.parse_timestamp;

DROP MATERIALIZED VIEW IF EXISTS oem.vm_global_map;

CREATE OR REPLACE FUNCTION oem.parse_timestamp(txt TEXT)
    RETURNS timestamp without time zone
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
AS $BODY$
DECLARE
    nonZeroTxt TEXT := REPLACE(REPLACE(txt, '0000-', '0001-'), '-00-00', '-01-01');
BEGIN
    RETURN CASE
        WHEN nonZeroTxt IS NULL THEN NULL
        WHEN LEFT(nonZeroTxt,1)!='-' AND SPLIT_PART(nonZeroTxt,'-',1)::BIGINT>294276 THEN NULL -- Timestamp after 294276 AD, not supported
        WHEN LEFT(nonZeroTxt,1)='-' AND SPLIT_PART(SUBSTRING(nonZeroTxt,2),'-',1)::BIGINT>4713 THEN NULL -- Timestamp before 4713 BC, not supported
        WHEN LEFT(nonZeroTxt,1)='-' THEN CONCAT(SUBSTRING(nonZeroTxt,2),' BC')::TIMESTAMP -- BC timestamp
        ELSE nonZeroTxt::TIMESTAMP -- AD timestamp
    END;
END;
$BODY$;

COMMENT ON FUNCTION oem.parse_timestamp(text) IS '
Takes as input an ISO 8601 timestamp string and returns a TIMESTAMP, unless the string is not representable (e.g. it overflows).
Documentation:
- https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME-TABLE
- https://www.postgresql.org/docs/current/functions-datetime.html#FUNCTIONS-DATETIME-EXTRACT
';

CREATE TABLE oem.osmdata (
    osm_id BIGSERIAL NOT NULL PRIMARY KEY,
    osm_geometry GEOMETRY(Geometry,4326) NOT NULL,
    osm_osm_type VARCHAR(8) NOT NULL CHECK (osm_osm_type IN ('node','way','relation')),
    osm_osm_id BIGINT NOT NULL,
    osm_tags JSONB,
    osm_has_text_etymology BOOLEAN DEFAULT FALSE,
    osm_has_wd_etymology BOOLEAN DEFAULT FALSE
);

CREATE TABLE oem.element_wikidata_cods (
    --ew_id BIGSERIAL NOT NULL PRIMARY KEY,
    ew_el_id BIGINT NOT NULL,
    ew_wikidata_cod VARCHAR(15) NOT NULL CHECK (ew_wikidata_cod  ~* '^Q\d+$'),
    ew_from_name_etymology BOOLEAN,
    ew_from_osm BOOLEAN,
    ew_from_key_id VARCHAR
);

CREATE TABLE oem.wikidata (
    wd_id SERIAL NOT NULL PRIMARY KEY,
    wd_wikidata_cod VARCHAR(15) NOT NULL UNIQUE CHECK (wd_wikidata_cod ~* '^Q\d+$'),
    wd_position GEOMETRY(Point,4326),
    wd_event_date TIMESTAMP,
    wd_event_date_precision INT,
    wd_start_date TIMESTAMP,
    wd_start_date_precision INT,
    wd_end_date TIMESTAMP,
    wd_end_date_precision INT,
    wd_birth_date TIMESTAMP,
    wd_birth_date_precision INT,
    wd_death_date TIMESTAMP,
    wd_death_date_precision INT,
    wd_commons VARCHAR,
    wd_gender_id INT REFERENCES oem.wikidata(wd_id),
    wd_instance_id INT REFERENCES oem.wikidata(wd_id),
    wd_download_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    wd_full_download_date TIMESTAMP DEFAULT NULL,
    wd_notes VARCHAR,
    wd_gender_descr VARCHAR,
    wd_gender_color VARCHAR,
    wd_type_descr VARCHAR,
    wd_type_color VARCHAR
);

CREATE UNIQUE INDEX wikidata_id_idx ON oem.wikidata (wd_id) WITH (fillfactor='100');

CREATE UNIQUE INDEX wikidata_cod_idx ON oem.wikidata (wd_wikidata_cod) WITH (fillfactor='100');

CREATE TABLE oem.element (
    el_id BIGINT NOT NULL PRIMARY KEY,
    el_geometry GEOMETRY(Geometry,4326) NOT NULL,
    el_osm_type VARCHAR(8) NOT NULL CHECK (el_osm_type IN ('node','way','relation')),
    el_osm_id BIGINT NOT NULL,
    el_tags JSONB,
    el_has_text_etymology BOOLEAN,
    el_has_wd_etymology BOOLEAN,
    el_wikidata_cod VARCHAR CHECK (el_wikidata_cod ~* '^Q\d+$'),
    el_commons VARCHAR,
    el_wikipedia VARCHAR
    --CONSTRAINT element_unique_osm_id UNIQUE (el_osm_type, el_osm_id) --! causes errors with osm2pgsql as it creates duplicates, see https://dev.openstreetmap.narkive.com/24KCpw1d/osm-dev-osm2pgsql-outputs-neg-and-duplicate-osm-ids-and-weird-attributes-in-table-rels
);

CREATE UNIQUE INDEX element_id_idx ON oem.element (el_id) WITH (fillfactor='100');

CREATE INDEX element_geometry_idx ON oem.element USING GIST (el_geometry) WITH (fillfactor='100');

CREATE TABLE oem.etymology (
    et_id SERIAL NOT NULL PRIMARY KEY,
    --et_el_id BIGINT NOT NULL REFERENCES oem.element(el_id), -- element is populated only at the end
    et_el_id BIGINT NOT NULL,
    et_wd_id INT NOT NULL REFERENCES oem.wikidata(wd_id),
    et_from_el_id BIGINT,
    et_recursion_depth INT DEFAULT 0,
    et_from_osm BOOLEAN DEFAULT FALSE,
    et_from_key_ids VARCHAR ARRAY,
    et_from_osm_wikidata_wd_id INT REFERENCES oem.wikidata(wd_id) DEFAULT NULL, -- Wikidata entity from which this etymology has been derived from
    et_from_parts_of_wd_id INT REFERENCES oem.wikidata(wd_id) DEFAULT NULL, -- Wikidata entity from whose P527 (has parts) property this etymology has been derived
    et_from_osm_wikidata_prop_cod VARCHAR CHECK (et_from_osm_wikidata_prop_cod ~* '^P\d+$') DEFAULT NULL, -- Wikidata property through which the etymology is derived
    CONSTRAINT et_unique_element_wikidata UNIQUE (et_el_id, et_wd_id)
);

CREATE INDEX etymology_el_id_idx ON oem.etymology (et_el_id) WITH (fillfactor='100');

CREATE TABLE oem.wikidata_picture (
    wdp_id SERIAL NOT NULL PRIMARY KEY,
    wdp_wd_id INT NOT NULL REFERENCES oem.wikidata(wd_id),
    wdp_picture VARCHAR NOT NULL,
    wdp_attribution VARCHAR,
    wdp_download_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    wdp_full_download_date TIMESTAMP,
    CONSTRAINT wdp_unique_wikidata_picture UNIQUE (wdp_wd_id, wdp_picture)
);

CREATE INDEX wikidata_picture_id_idx ON oem.wikidata_picture (wdp_wd_id) WITH (fillfactor='100');

CREATE TABLE oem.wikidata_text (
    wdt_id SERIAL NOT NULL PRIMARY KEY,
    wdt_wd_id INT NOT NULL REFERENCES oem.wikidata(wd_id),
    wdt_language CHAR(3) NOT NULL,
    wdt_name VARCHAR,
    wdt_description VARCHAR,
    wdt_wikipedia_url VARCHAR,
    wdt_occupations VARCHAR,
    wdt_citizenship VARCHAR,
    wdt_prizes VARCHAR,
    wdt_event_place VARCHAR,
    wdt_birth_place VARCHAR,
    wdt_death_place VARCHAR,
    wdt_download_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    wdt_full_download_date TIMESTAMP,
    CONSTRAINT wdt_unique_wikidata_language UNIQUE (wdt_wd_id, wdt_language)
);

CREATE INDEX wikidata_text_id_idx ON oem.wikidata_text (wdt_wd_id) WITH (fillfactor='100');

CREATE OR REPLACE FUNCTION oem.et_source_color(et oem.etymology)
    RETURNS text
    LANGUAGE 'sql'
    COST 100
    VOLATILE PARALLEL UNSAFE
AS $BODY$
SELECT CASE
	WHEN et.et_recursion_depth != 0 THEN '#ff3333'
	WHEN et.et_from_osm THEN '#33ff66'
	WHEN et.et_from_osm_wikidata_wd_id IS NOT NULL THEN '#3399ff'
	ELSE NULL
END
$BODY$;

CREATE OR REPLACE FUNCTION oem.et_source_name(et oem.etymology)
    RETURNS text
    LANGUAGE 'sql'
    COST 100
    VOLATILE PARALLEL UNSAFE
AS $BODY$
SELECT CASE
	WHEN et.et_recursion_depth != 0 THEN 'Propagation'
	WHEN et.et_from_osm THEN 'OpenStreetMap'
	WHEN et.et_from_osm_wikidata_wd_id IS NOT NULL THEN 'Wikidata'
	ELSE NULL
END
$BODY$;

CREATE OR REPLACE FUNCTION oem.et_century_color(century NUMERIC)
    RETURNS text
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
AS $BODY$
DECLARE
    color_ratio INT := CASE
        WHEN century IS NULL
        THEN NULL
        ELSE (LEAST(GREATEST(century,5), 21) - 5) / 16.0 * 255 -- color mapping [5, 21] => [0, 255]
    END;
BEGIN
    RETURN 'rgb('|| color_ratio ||',50,' || 255-color_ratio || ')';
END
$BODY$;
