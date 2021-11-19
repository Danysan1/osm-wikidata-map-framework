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
  "ele_id" UNSIGNED BIG INT NOT NULL,
  "ele_lat" FLOAT,
  "ele_lon" FLOAT,
  "ele_osm_type" VARCHAR(8) NOT NULL,
  "ele_osm_id" INT NOT NULL,
  "ele_wkb" VARCHAR,
  "ele_wikidata_id" VARCHAR(10),
  "ele_subject_wikidata_id" VARCHAR(10),
  "ele_name_etymology_wikidata_id" VARCHAR(10),
  "ele_download_date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("ele_id")
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
  "ety_id" UNSIGNED BIG INT NOT NULL,
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
  PRIMARY KEY ("ety_id"),
  CONSTRAINT "ety_named_after_ety" FOREIGN KEY ("ety_named_after_ety_id") REFERENCES "etymology" ("ety_id") ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "ety_instance_of_ety" FOREIGN KEY ("ety_instance_of_ety_id") REFERENCES "etymology" ("ety_id") ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "ety_gender_ety" FOREIGN KEY ("ety_gender_ety_id") REFERENCES "etymology" ("ety_id") ON DELETE SET NULL ON UPDATE NO ACTION
);

-- ----------------------------
-- Table structure for etymology_text
-- ----------------------------
DROP TABLE IF EXISTS "etymology_text";
CREATE TABLE "etymology_text" (
  "ett_id" UNSIGNED BIG INT NOT NULL,
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
  PRIMARY KEY ("ett_id"),
  CONSTRAINT "ett_ety" FOREIGN KEY ("ett_ety_id") REFERENCES "etymology" ("ety_id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- ----------------------------
-- Table structure for osmdata
-- ----------------------------
DROP TABLE IF EXISTS "osmdata";
CREATE TABLE "osmdata" (
  "id" UNSIGNED BIG INT NOT NULL,
  "wkb" GEOMETRY,
  "osm_type" TEXT,
  "osm_id" BIGINT,
  "tags" JSON,
  PRIMARY KEY ("id")
);

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
