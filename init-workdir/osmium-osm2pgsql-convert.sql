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
