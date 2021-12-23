INSERT INTO element (
  el_osm_type,
  el_osm_id,
  el_name,
  el_wikidata,
  el_subject_wikidata,
  el_name_etymology_wikidata,
  el_geometry)
SELECT
  osm_type,
  osm_id,
  tags->'name',
  tags->'wikidata',
  tags->'subject:wikidata',
  tags->'name:etymology:wikidata',
  geom
FROM osmdata;
