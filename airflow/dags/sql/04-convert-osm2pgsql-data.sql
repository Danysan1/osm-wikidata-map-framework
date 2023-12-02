INSERT INTO owmf.osmdata (osm_osm_type, osm_osm_id, osm_tags, osm_geometry)
SELECT 'node', osm_id, hstore_to_jsonb(tags), way
FROM planet_osm_point
UNION
SELECT
    CASE WHEN osm_id > 0 THEN 'way' ELSE 'relation' END AS osm_type,
    CASE WHEN osm_id > 0 THEN osm_id ELSE -osm_id END AS osm_id,
    hstore_to_jsonb(tags),
    way AS geom
FROM planet_osm_line
UNION
SELECT
    CASE WHEN osm_id > 0 THEN 'way' ELSE 'relation' END AS osm_type,
    CASE WHEN osm_id > 0 THEN osm_id ELSE -osm_id END AS osm_id,
    hstore_to_jsonb(tags),
    way AS geom
FROM planet_osm_polygon
ON CONFLICT (osm_osm_type, osm_osm_id, osm_wd_id) DO NOTHING; --! osm2pgsql creates duplicates: https://dev.openstreetmap.narkive.com/24KCpw1d/osm-dev-osm2pgsql-outputs-neg-and-duplicate-osm-ids-and-weird-attributes-in-table-rels
