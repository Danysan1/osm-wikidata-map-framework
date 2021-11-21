SELECT load_extension('mod_spatialite');

SELECT CASE WHEN 0=CheckSpatialMetaData() THEN InitSpatialMetaDataFull('WGS84_ONLY') END;

SELECT DisableSpatialIndex('osmgeojson','geometry');
SELECT DiscardGeometryColumn('osmgeojson','geometry');
DROP TABLE IF EXISTS idx_osmgeojson_geometry;
DROP TABLE IF EXISTS osmgeojson;

/*
 Navicat SQLite Data Transfer

 Source Server         : open-etymology-map
 Source Server Type    : SQLite
 Source Server Version : 3030001
 Source Schema         : main

 Target Server Type    : SQLite
 Target Server Version : 3030001
 File Encoding         : 65001

 Date: 20/11/2021 00:23:25
*/

PRAGMA foreign_keys = false;

-- ----------------------------
-- Table structure for element
-- ----------------------------
DROP TABLE IF EXISTS "element";
CREATE TABLE "element" (
  "ele_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "ele_geom" GEOMETRY NOT NULL,
  "ele_osm_type" VARCHAR(8) NOT NULL,
  "ele_osm_id" INT NOT NULL,
  "ele_lat" FLOAT,
  "ele_lon" FLOAT,
  "ele_wikidata_id" VARCHAR(10),
  "ele_subject_wikidata_id" VARCHAR(10),
  "ele_name_etymology_wikidata_id" VARCHAR(10),
  "ele_download_date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------
-- Table structure for element_etymology
-- ----------------------------
DROP TABLE IF EXISTS "element_etymology";
CREATE TABLE "element_etymology" (
  "ee_ety_id" UNSIGNED BIG INT NOT NULL,
  "ee_ele_id" UNSIGNED BIG INT NOT NULL,
  "download_date" timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("ee_ety_id", "ee_ele_id"),
  FOREIGN KEY ("ee_ety_id") REFERENCES "etymology" ("ety_id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  FOREIGN KEY ("ee_ele_id") REFERENCES "element" ("ele_id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- ----------------------------
-- Table structure for etymology
-- ----------------------------
DROP TABLE IF EXISTS "etymology";
CREATE TABLE "etymology" (
  "ety_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "ety_wikidata_id" VARCHAR(10) NOT NULL,
  "ety_named_after_ety_id" UNSIGNED BIG INT,
  "ety_instance_of_ety_id" UNSIGNED BIG INT,
  "ety_gender_ety_id" UNSIGNED BIG INT,
  "ety_wkt" VARCHAR,
  "ety_event_date" TIMESTAMP,
  "ety_event_date_precision" INT,
  "ety_start_date" TIMESTAMP,
  "ety_start_date_precision" INT,
  "ety_end_date" TIMESTAMP,
  "ety_end_date_precision" INT,
  "ety_birth_date" TIMESTAMP,
  "ety_birth_date_precision" INT,
  "ety_death_date" TIMESTAMP,
  "ety_death_date_precision" INT,
  "ety_commons_url" VARCHAR,
  "ety_download_date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ety_named_after_ety" FOREIGN KEY ("ety_named_after_ety_id") REFERENCES "etymology" ("ety_id") ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "ety_instance_of_ety" FOREIGN KEY ("ety_instance_of_ety_id") REFERENCES "etymology" ("ety_id") ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "ety_gender_ety" FOREIGN KEY ("ety_gender_ety_id") REFERENCES "etymology" ("ety_id") ON DELETE SET NULL ON UPDATE NO ACTION
);

-- ----------------------------
-- Table structure for etymology_text
-- ----------------------------
DROP TABLE IF EXISTS "etymology_text";
CREATE TABLE "etymology_text" (
  "ett_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "ett_ety_id" UNSIGNED BIG INT NOT NULL,
  "ett_language" CHAR(2),
  "ett_name" VARCHAR,
  "ett_description" VARCHAR,
  "ett_gender" VARCHAR,
  "ett_wikipedia_url" VARCHAR,
  "ett_occupations" VARCHAR,
  "ett_citizenship" VARCHAR,
  "ett_pictures" VARCHAR,
  "ett_prizes" VARCHAR,
  "ett_event_place" VARCHAR,
  "ett_birth_place" VARCHAR,
  "ett_death_place" VARCHAR,
  "ett_download_date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ett_ety" FOREIGN KEY ("ett_ety_id") REFERENCES "etymology" ("ety_id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- ----------------------------
-- Table structure for osmdata
-- ----------------------------
SELECT DiscardGeometryColumn('osmdata','geometry');
DROP TABLE IF EXISTS "osmdata";
CREATE TABLE "osmdata" (
  "id" UNSIGNED BIG INT NOT NULL PRIMARY KEY,
  "osm_type" TEXT,
  "osm_id" BIGINT,
  "tags" JSON
);
SELECT AddGeometryColumn('osmdata', 'geometry', 4326, 'GEOMETRY');

-- ----------------------------
-- Indexes structure for table element
-- ----------------------------
CREATE INDEX "element_center"
ON "element" (
  "ele_lat" ASC,
  "ele_lon" ASC
);
CREATE UNIQUE INDEX "element_osm"
ON "element" (
  "ele_osm_type" ASC,
  "ele_osm_id" ASC
);

PRAGMA foreign_keys = true;
