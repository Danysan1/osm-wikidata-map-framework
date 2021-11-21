SELECT load_extension('mod_spatialite');


SELECT * FROM osmgeojson LIMIT 1;

-- SELECT * FROM osmdata LIMIT 1;

-- INSERT INTO element(
--   ele_geom, ele_lat, ele_lon, ele_osm_type, ele_osm_id
-- )
-- SELECT
--   geom,
--   ST_X(ST_Centroid(ST_GeomFromWKB(geom, 4326))),
--   ST_Y(ST_Centroid(ST_GeomFromWKB(geom, 4326))),
--   osm_type,
--   osm_id
-- FROM osmdata;
