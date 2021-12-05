INSERT INTO etymology (et_type, et_osm_id, et_wd_id)
SELECT DISTINCT ele.type, ele.osm_id, wd.wd_id
FROM (
  SELECT
    'node' AS type,
    osm_id,
    tags->'wikidata' AS wikidata_id,
    tags->'subject:wikidata' AS subject_wikidata_id,
    tags->'name:etymology:wikidata' AS etymology_wikidata_id
  FROM "planet_osm_point"
  UNION
  SELECT
    'line' AS type,
    osm_id,
    tags->'wikidata' AS wikidata_id,
    tags->'subject:wikidata' AS subject_wikidata_id,
    tags->'name:etymology:wikidata' AS etymology_wikidata_id
  FROM "planet_osm_line"
  UNION
  SELECT
    'polygon' AS type,
    osm_id,
    tags->'wikidata' AS wikidata_id,
    tags->'subject:wikidata' AS subject_wikidata_id,
    tags->'name:etymology:wikidata' AS etymology_wikidata_id
  FROM "planet_osm_polygon"
) AS ele
LEFT JOIN "wikidata_named_after" AS wna
  ON wna.wna_wikidata_id = ele.wikidata_id
LEFT JOIN "wikidata" AS wd
  ON wd.wd_wikidata_id = ele.subject_wikidata_id
  OR wd.wd_wikidata_id = ele.etymology_wikidata_id
  OR wd.wd_wikidata_id = wna.wna_named_after_wikidata_id
WHERE wd.wd_id IS NOT NULL;

CREATE MATERIALIZED VIEW IF NOT EXISTS v_element AS
SELECT
  name,
  'node' AS type,
  osm_id AS id,
  wikidata.*,
  way AS geom
FROM etymology
JOIN planet_osm_point ON et_osm_id = osm_id
JOIN wikidata ON et_wd_id = wd_id
WHERE et_type='point'
UNION
SELECT
  name,
  CASE WHEN osm_id > 0 THEN 'way' ELSE 'relation' END AS type,
  CASE WHEN osm_id > 0 THEN osm_id ELSE -osm_id END AS id,
  wikidata.*,
  way AS geom
FROM etymology
JOIN planet_osm_line ON et_osm_id = osm_id
JOIN wikidata ON et_wd_id = wd_id
WHERE et_type='line'
UNION
SELECT
  name,
  CASE WHEN osm_id > 0 THEN 'way' ELSE 'relation' END AS type,
  CASE WHEN osm_id > 0 THEN osm_id ELSE -osm_id END AS id,
  wikidata.*,
  way AS geom
FROM etymology
JOIN planet_osm_polygon ON et_osm_id = osm_id
JOIN wikidata ON et_wd_id = wd_id
WHERE et_type='polygon';
