DROP TABLE IF EXISTS "osmdata";
CREATE TABLE "osmdata" (
  "id" BIGINT NOT NULL PRIMARY KEY,
  "geom" GEOMETRY NOT NULL,
  "osm_type" TEXT NOT NULL,
  "osm_id" BIGINT NOT NULL,
  "tags" JSON
);