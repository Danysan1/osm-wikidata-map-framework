DROP SCHEMA IF EXISTS owmf CASCADE;
CREATE SCHEMA owmf;

CREATE OR REPLACE FUNCTION owmf.parse_timestamp(txt TEXT)
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

COMMENT ON FUNCTION owmf.parse_timestamp(text) IS '
Takes as input an ISO 8601 timestamp string and returns a TIMESTAMP, unless the string is not representable (e.g. it overflows).
Documentation:
- https://www.postgresql.org/docs/current/datatype-datetime.html#DATATYPE-DATETIME-TABLE
- https://www.postgresql.org/docs/current/functions-datetime.html#FUNCTIONS-DATETIME-EXTRACT
';

CREATE TABLE owmf.wikidata (
    wd_id SERIAL NOT NULL PRIMARY KEY,
    wd_wikidata_cod VARCHAR(15) NOT NULL UNIQUE CHECK (wd_wikidata_cod ~* '^Q\d+$'),
    wd_alias_cod VARCHAR(15) UNIQUE CHECK (wd_alias_cod ~* '^Q\d+$'),
    wd_pseudo_tags JSONB, -- Details from Wikidata, arranged in the same format as OSM tags
    wd_creation_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    wd_notes VARCHAR
);
CREATE UNIQUE INDEX wikidata_id_idx ON owmf.wikidata (wd_id) WITH (fillfactor='80');
CREATE UNIQUE INDEX wikidata_cod_idx ON owmf.wikidata (wd_wikidata_cod) WITH (fillfactor='80');
CREATE UNIQUE INDEX wikidata_alias_idx ON owmf.wikidata (wd_alias_cod) WITH (fillfactor='80');

CREATE TABLE owmf.osmdata (
    osm_id BIGSERIAL NOT NULL PRIMARY KEY,
    osm_geometry GEOMETRY(Geometry,4326) NOT NULL,
    osm_osm_type VARCHAR(8) CHECK (osm_osm_type IN ('node','way','relation')),
    osm_osm_id BIGINT,
    osm_tags JSONB,
    osm_wd_id INT REFERENCES owmf.wikidata(wd_id) DEFAULT NULL,
    osm_name VARCHAR,
    osm_commons VARCHAR,
    CONSTRAINT osmdata_unique_ids UNIQUE NULLS NOT DISTINCT (osm_osm_type, osm_osm_id, osm_wd_id)
);
CREATE INDEX osmdata_wd_id_idx ON owmf.osmdata (osm_wd_id) WITH (fillfactor='70');

CREATE TABLE owmf.element_wikidata_cods (
    --ew_id BIGSERIAL NOT NULL PRIMARY KEY,
    ew_el_id BIGINT NOT NULL,
    ew_wikidata_cod VARCHAR(15) NOT NULL CHECK (ew_wikidata_cod  ~* '^Q\d+$'),
    ew_from_key_id VARCHAR
);

CREATE TABLE owmf.element (
    el_id BIGINT NOT NULL PRIMARY KEY,
    el_geometry GEOMETRY(Geometry,4326) NOT NULL,
    el_osm_type VARCHAR(8) CHECK (el_osm_type IN ('node','way','relation')),
    el_osm_id BIGINT,
    el_tags JSONB,
    el_is_boundary BOOLEAN DEFAULT FALSE,
    el_wikidata_cod VARCHAR CHECK (el_wikidata_cod ~* '^Q\d+$'),
    el_commons VARCHAR,
    el_wikipedia VARCHAR,
    CONSTRAINT element_unique_ids UNIQUE (el_osm_type, el_osm_id, el_wikidata_cod)
);
CREATE UNIQUE INDEX element_id_idx ON owmf.element (el_id) WITH (fillfactor='100');
CREATE INDEX element_geometry_idx ON owmf.element USING GIST (el_geometry) WITH (fillfactor='100');

CREATE TABLE owmf.etymology (
    et_id SERIAL NOT NULL PRIMARY KEY,
    --et_el_id BIGINT NOT NULL REFERENCES owmf.element(el_id), -- element is populated only at the end
    et_el_id BIGINT NOT NULL,
    et_wd_id INT REFERENCES owmf.wikidata(wd_id),
    et_name VARCHAR,
    et_from_el_id BIGINT,
    et_recursion_depth INT DEFAULT 0,
    et_from_osm_instance VARCHAR,
    et_from_key_ids VARCHAR ARRAY,
    et_from_osm_wikidata_wd_id INT REFERENCES owmf.wikidata(wd_id) DEFAULT NULL, -- Wikidata entity from which this etymology has been derived from
    et_from_osm_wikidata_prop_cod VARCHAR CHECK (et_from_osm_wikidata_prop_cod ~* '^P\d+$') DEFAULT NULL, -- P-ID of the Wikidata property through which the etymology is derived
    CONSTRAINT et_not_empty CHECK (et_wd_id IS NOT NULL OR et_name IS NOT NULL),
    CONSTRAINT et_unique_element_wikidata UNIQUE (et_el_id, et_wd_id, et_name)
);
CREATE INDEX etymology_el_id_idx ON owmf.etymology (et_el_id) WITH (fillfactor='80');
